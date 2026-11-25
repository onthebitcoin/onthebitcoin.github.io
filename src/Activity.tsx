// Recent activity (transaction history) table, per chain, backed by
// Blockscout's public v2 API (works for both Base and Ink, no API key).
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { base, ink } from 'viem/chains'
import { formatUnits } from 'viem'
import { fetchRecentActivity, explorerTxUrl } from './blockscout'
import { Skeleton, ErrorState, EmptyState } from './ui'

const CHAINS = [base, ink]

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

function ChainActivityTable({ chainId }: { chainId: number }) {
  const { address } = useAccount()
  const chainMeta = CHAINS.find((c) => c.id === chainId)!

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['activity', chainId, address],
    queryFn: () => fetchRecentActivity(chainId, address!, 10),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-3 font-semibold text-neutral-100">
        {chainMeta.name} — recent activity
      </h3>

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

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
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
              {data!.map((tx) => (
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
  const { isConnected } = useAccount()
  if (!isConnected) return null

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-neutral-200">
        Recent activity
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {CHAINS.map((c) => (
          <ChainActivityTable key={c.id} chainId={c.id} />
        ))}
      </div>
    </section>
  )
}
