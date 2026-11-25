// Recent activity (transaction history) table, per chain, backed by
// Blockscout's public v2 API (works for both Base and Ink, no API key).
// Includes a simple Sent/Received filter and a CSV export per chain.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { arbitrum, base, ink, optimism } from 'viem/chains'
import { formatUnits } from 'viem'
import { fetchRecentActivity, explorerTxUrl } from './blockscout'
import { useViewingAddress } from './viewingAddress'
import { downloadCsv } from './csv'
import { Skeleton, ErrorState, EmptyState } from './ui'

const CHAINS = [base, ink, optimism, arbitrum]

type DirectionFilter = 'all' | 'sent' | 'received'

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

function ChainActivityTable({ chainId, address }: { chainId: number; address: `0x${string}` }) {
  const chainMeta = CHAINS.find((c) => c.id === chainId)!
  const [filter, setFilter] = useState<DirectionFilter>('all')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activity', chainId, address],
    queryFn: () => fetchRecentActivity(chainId, address, 10),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    if (!data) return data
    if (filter === 'all') return data
    return data.filter((tx) => (filter === 'sent' ? tx.isOutgoing : !tx.isOutgoing))
  }, [data, filter])

  function handleExport() {
    if (!data || data.length === 0) return
    downloadCsv(
      `onthebitcoin-activity-${chainMeta.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      data.map((tx) => ({
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
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-neutral-100">
          {chainMeta.name} — recent activity
        </h3>
        {(data?.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as DirectionFilter)}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-300 focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300"
            >
              Export CSV
            </button>
          </div>
        )}
      </div>

      {isLoading && <TableSkeleton />}

      {isError && (
        <ErrorState
          message={`Could not load activity: ${(error as Error)?.message ?? 'unknown error'}`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState message={`No recent transactions found on ${chainMeta.name}.`} />
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (filtered?.length ?? 0) === 0 && (
        <EmptyState message="No transactions match this filter." />
      )}

      {!isLoading && !isError && (filtered?.length ?? 0) > 0 && (
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
              {filtered!.map((tx) => (
                <tr key={tx.hash} className="border-t border-neutral-800">
                  <td className="py-2 pr-3 text-neutral-400 whitespace-nowrap">
                    {formatTime(tx.timestamp)}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        tx.isOutgoing ? 'text-orange-300' : 'text-emerald-300'
                      }
                    >
                      {tx.isOutgoing ? 'Sent' : 'Received'}
                    </span>
                    <span className="ml-1.5 text-neutral-400">
                      {tx.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-neutral-100 whitespace-nowrap">
                    {Number(formatUnits(BigInt(tx.valueWei), 18)).toFixed(5)}{' '}
                    {chainMeta.nativeCurrency.symbol}
                  </td>
                  <td className="py-2">
                    <a
                      href={explorerTxUrl(chainId, tx.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-purple-300 hover:underline"
                    >
                      {shortHash(tx.hash)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function Activity() {
  const { address } = useViewingAddress()
  if (!address) return null

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-200">
        Recent activity
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHAINS.map((c) => (
          <ChainActivityTable key={c.id} chainId={c.id} address={address} />
        ))}
      </div>
    </section>
  )
}
