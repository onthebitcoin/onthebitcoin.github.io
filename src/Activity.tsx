// Recent activity (transaction history) table, per chain, backed by
// Blockscout's public v2 API (works for Base/Ink/Optimism/Arbitrum, no API
// key). Includes a Sent/Received filter, CSV export, pagination ("Load
// more") so a busy wallet never renders hundreds of rows at once, a
// "still loading" hint for slow networks/APIs, a summary stat line, and a
// click-to-expand detail view per transaction.
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatUnits } from 'viem'
import { fetchRecentActivity, explorerTxUrl, type ActivityItem } from './blockscout'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { downloadCsv } from './csv'
import { Skeleton, ErrorState, EmptyState, useSlowLoading, DataSourceNote } from './ui'

const PAGE_SIZE = 20

type DirectionFilter = 'all' | 'sent' | 'received'
type PageCursor = Record<string, string | number> | null

function shortHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

function formatTime(ts: string | null) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFullTime(ts: string | null) {
  if (!ts) return 'Unknown'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  return d.toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'medium',
  })
}

const DAY_MS = 24 * 60 * 60 * 1000

function isWithin24h(ts: string | null): boolean {
  if (!ts) return false
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return false
  return Date.now() - d.getTime() < DAY_MS
}

function TableSkeleton() {
  return (
    <div className="space-y-2 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Turns a thrown error into a short, specific label instead of a raw stack. */
function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError') return `Timed out — ${err.message}.`
    return err.message
  }
  return 'Unknown error.'
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="col-span-2 break-all font-mono text-neutral-100 light:text-neutral-900">{value}</span>
    </div>
  )
}

function TxDetailModal({
  tx,
  chainId,
  chainName,
  symbol,
  onClose,
}: {
  tx: ActivityItem
  chainId: number
  chainName: string
  symbol: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-neutral-700 light:border-neutral-300 bg-neutral-900 light:bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-semibold text-neutral-100 light:text-neutral-900">
            {chainName} transaction
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-neutral-400 light:text-neutral-600 hover:text-neutral-100 light:text-neutral-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="divide-y divide-neutral-800">
          <DetailRow label="Hash" value={tx.hash} />
          <DetailRow label="Time" value={formatFullTime(tx.timestamp)} />
          <DetailRow
            label="Direction"
            value={
              <span className={tx.isOutgoing ? 'text-orange-300' : 'text-emerald-300'}>
                {tx.isOutgoing ? 'Sent' : 'Received'}
              </span>
            }
          />
          <DetailRow label="Method" value={tx.action} />
          <DetailRow
            label="Value"
            value={`${Number(formatUnits(BigInt(tx.valueWei), 18)).toFixed(8)} ${symbol}`}
          />
          <DetailRow label="From" value={tx.from} />
          <DetailRow label="To" value={tx.to ?? '—'} />
          <DetailRow label="Status" value={tx.status} />
        </div>

        <a
          href={explorerTxUrl(chainId, tx.hash)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-lg border border-neutral-700 light:border-neutral-300 px-3 py-1.5 text-sm text-purple-300 hover:border-purple-500"
        >
          View on block explorer ↗
        </a>
      </div>
    </div>
  )
}

function ChainActivityTable({
  chainId,
  address,
  onSummary,
}: {
  chainId: number
  address: `0x${string}`
  onSummary?: (summary: { total: number; sentCount: number; receivedCount: number } | null) => void
}) {
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!
  const [filter, setFilter] = useState<DirectionFilter>('all')
  const [selectedTx, setSelectedTx] = useState<ActivityItem | null>(null)

  // Extra pages loaded via "Load more", beyond the first page React Query
  // owns. Reset whenever we're looking at a different chain/address so
  // stale pages from a previous wallet never leak into the new one.
  const [extraPages, setExtraPages] = useState<ActivityItem[][]>([])
  const [cursor, setCursor] = useState<PageCursor>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activity', chainId, address],
    queryFn: () => fetchRecentActivity(chainId, address, { limit: PAGE_SIZE }),
    staleTime: 30_000,
  })

  useEffect(() => {
    setExtraPages([])
    setCursor(null)
    setLoadMoreError(null)
  }, [chainId, address])

  const showSlowHint = useSlowLoading(isLoading, 1200)

  const allItems = useMemo(
    () => [...(data?.items ?? []), ...extraPages.flat()],
    [data, extraPages],
  )
  const nextCursor = extraPages.length > 0 ? cursor : (data?.nextPageParams ?? null)

  async function handleLoadMore() {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchRecentActivity(chainId, address, {
        limit: PAGE_SIZE,
        pageParams: nextCursor,
      })
      setExtraPages((prev) => [...prev, page.items])
      setCursor(page.nextPageParams)
    } catch (err) {
      setLoadMoreError(describeError(err))
    } finally {
      setIsLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return allItems
    return allItems.filter((tx) => (filter === 'sent' ? tx.isOutgoing : !tx.isOutgoing))
  }, [allItems, filter])

  // Summary stats over everything loaded so far (not the server-side total —
  // Blockscout doesn't expose a cheap total count, so this is honestly
  // scoped to "loaded" and the label says so).
  const summary = useMemo(() => {
    const sent = allItems.filter((tx) => tx.isOutgoing)
    const received = allItems.filter((tx) => !tx.isOutgoing)
    const volumeWei = allItems.reduce((sum, tx) => sum + BigInt(tx.valueWei), 0n)
    const recentCount = allItems.filter((tx) => isWithin24h(tx.timestamp)).length
    return {
      total: allItems.length,
      sentCount: sent.length,
      receivedCount: received.length,
      volume: Number(formatUnits(volumeWei, 18)),
      recentCount,
    }
  }, [allItems])

  useEffect(() => {
    if (isLoading) {
      onSummary?.(null)
      return
    }
    onSummary?.(
      allItems.length > 0
        ? { total: summary.total, sentCount: summary.sentCount, receivedCount: summary.receivedCount }
        : { total: 0, sentCount: 0, receivedCount: 0 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary, isLoading])

  function handleExport() {
    if (allItems.length === 0) return
    downloadCsv(
      `onthebitcoin-activity-${chainMeta.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      allItems.map((tx) => ({
        chain: chainMeta.name,
        time: tx.timestamp ?? '',
        direction: tx.isOutgoing ? 'Sent' : 'Received',
        action: tx.action,
        value: formatUnits(BigInt(tx.valueWei), 18),
        symbol: chainMeta.nativeCurrency.symbol,
        from: tx.from,
        to: tx.to ?? '',
        hash: tx.hash,
        explorerUrl: explorerTxUrl(chainId, tx.hash),
      })),
    )
  }

  return (
    <div className="rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-neutral-100 light:text-neutral-900">
          {chainMeta.name} — recent activity
        </h3>
        {allItems.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as DirectionFilter)}
              className="rounded-lg border border-neutral-700 light:border-neutral-300 bg-neutral-950 light:bg-neutral-50 px-2 py-1 text-xs text-neutral-300 light:text-neutral-700 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-neutral-700 light:border-neutral-300 px-2 py-1 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300"
            >
              Export CSV
            </button>
          </div>
        )}
      </div>

      {allItems.length > 0 && (
        <p className="mb-1 text-xs text-neutral-500">
          Showing latest {summary.total} transaction{summary.total === 1 ? '' : 's'} loaded
          from Blockscout — {summary.sentCount} sent ·{' '}
          {summary.receivedCount} received · ~{summary.volume.toFixed(4)}{' '}
          {chainMeta.nativeCurrency.symbol} volume
          {summary.recentCount > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="text-purple-300">
                {summary.recentCount} in the last 24h
              </span>
            </>
          )}
        </p>
      )}
      <DataSourceNote>
        Activity from Blockscout — not necessarily this wallet's entire history
      </DataSourceNote>

      {isLoading && (
        <>
          <TableSkeleton />
          {showSlowHint && (
            <p className="mt-2 text-xs text-neutral-500">
              Loading activity on {chainMeta.name}…
            </p>
          )}
        </>
      )}

      {isError && (
        <ErrorState
          message={`Could not load activity on ${chainMeta.name}: ${describeError(error)}`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && allItems.length === 0 && (
        <EmptyState message={`No recent transactions found on ${chainMeta.name}.`} />
      )}

      {!isLoading && !isError && allItems.length > 0 && filtered.length === 0 && (
        <EmptyState message="No transactions match this filter." />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-neutral-500">
                <th className="pb-2 pr-3 font-medium">Time</th>
                <th className="pb-2 pr-3 font-medium">Action</th>
                <th className="pb-2 pr-3 font-medium">Value</th>
                <th className="pb-2 font-medium">Tx hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => {
                const isRecent = isWithin24h(tx.timestamp)
                return (
                <tr
                  key={tx.hash}
                  onClick={() => setSelectedTx(tx)}
                  className={`cursor-pointer border-t border-neutral-800 light:border-neutral-300 hover:bg-neutral-800/50 light:hover:bg-neutral-200/50 ${
                    isRecent ? 'bg-purple-500/5' : ''
                  }`}
                >
                  <td className="py-2 pr-3 text-neutral-400 light:text-neutral-600 whitespace-nowrap">
                    {formatTime(tx.timestamp)}
                    {isRecent && (
                      <span className="ml-1.5 rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300">
                        24h
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        tx.isOutgoing ? 'text-orange-300' : 'text-emerald-300'
                      }
                    >
                      {tx.isOutgoing ? 'Sent' : 'Received'}
                    </span>
                    <span className="ml-1.5 text-neutral-400 light:text-neutral-600">
                      {tx.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-neutral-100 light:text-neutral-900 whitespace-nowrap">
                    {Number(formatUnits(BigInt(tx.valueWei), 18)).toFixed(5)}{' '}
                    {chainMeta.nativeCurrency.symbol}
                  </td>
                  <td className="py-2">
                    <a
                      href={explorerTxUrl(chainId, tx.hash)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-purple-300 hover:underline"
                    >
                      {shortHash(tx.hash)}
                    </a>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>

          {nextCursor && filter === 'all' && (
            <div className="mt-3 flex flex-col items-center gap-1 border-t border-neutral-800 light:border-neutral-300 pt-3">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="rounded-lg border border-neutral-700 light:border-neutral-300 px-3 py-1.5 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading more…' : `Load ${PAGE_SIZE} more`}
              </button>
              {loadMoreError && (
                <p className="text-xs text-red-400">{loadMoreError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedTx && (
        <TxDetailModal
          tx={selectedTx}
          chainId={chainId}
          chainName={chainMeta.name}
          symbol={chainMeta.nativeCurrency.symbol}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </div>
  )
}

export default function Activity({
  onSummary,
}: {
  onSummary?: (summary: { total: number; sentCount: number; receivedCount: number } | null) => void
}) {
  const { address } = useViewingAddress()
  const { chainId } = useSelectedChain()

  if (!address) return null

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-neutral-200 light:text-neutral-800">
        Recent activity
      </h2>
      <ChainActivityTable chainId={chainId} address={address} onSummary={onSummary} />
    </section>
  )
}
