// Compact "Wallet Analysis" summary for whichever chain is selected —
// pulls together numbers that Balances/Activity/Nfts already compute (via
// callbacks lifted up through App.tsx) rather than re-fetching anything
// itself, so it's just a read-only view over data the sections already
// loaded.
import { formatUsd } from './prices'
import { DataSourceNote } from './ui'

export interface AnalysisData {
  usdTotal: number | null
  txCount: number | null
  sentCount: number | null
  receivedCount: number | null
  nftCount: number | null
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 transition hover:border-neutral-700">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 font-mono text-base text-neutral-100">{value}</p>
    </div>
  )
}

function buildTags(data: AnalysisData): string[] {
  const tags: string[] = []

  if (data.txCount !== null) {
    if (data.txCount === 0) tags.push('No recent activity')
    else if (data.txCount >= 15) tags.push('Active wallet')
    else tags.push('Low activity')
  }

  if (data.nftCount !== null && data.nftCount > 0) {
    tags.push('NFT holder')
  }

  if (data.sentCount !== null && data.receivedCount !== null && data.sentCount + data.receivedCount > 0) {
    const sendRatio = data.sentCount / (data.sentCount + data.receivedCount)
    if (sendRatio >= 0.8) tags.push('Mostly sending')
    else if (sendRatio <= 0.2 && data.receivedCount > 0) tags.push('Mostly receiving')
  }

  return tags
}

export default function WalletAnalysis({
  chainName,
  data,
}: {
  chainName: string
  data: AnalysisData
}) {
  const tags = buildTags(data)
  const sentReceivedLabel =
    data.sentCount !== null && data.receivedCount !== null
      ? `${data.sentCount} / ${data.receivedCount}`
      : '—'

  return (
    <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-200">
          Wallet analysis — {chainName}
        </h2>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs text-purple-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <DataSourceNote>
        Based on the {chainName} data loaded in the sections below — not
        necessarily this wallet's complete history
      </DataSourceNote>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Est. value" value={formatUsd(data.usdTotal)} />
        <StatTile
          label="Transactions (loaded)"
          value={data.txCount !== null ? String(data.txCount) : '—'}
        />
        <StatTile label="Sent / Received" value={sentReceivedLabel} />
        <StatTile
          label="NFTs"
          value={data.nftCount !== null ? String(data.nftCount) : '—'}
        />
      </div>
    </section>
  )
}
