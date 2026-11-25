// Quick links out to swap aggregators / DEX apps — pure navigation, no
// swap logic in this app at all. Always visible (doesn't need a connected
// or even a watch-only address), opens in a new tab.
const TOOLS = [
  {
    label: 'Jumper',
    href: 'https://jumper.exchange/',
    description: 'Cross-chain swap aggregator (LI.FI powered)',
  },
  {
    label: 'LI.FI',
    href: 'https://li.fi/',
    description: 'The aggregation protocol behind Jumper',
  },
  {
    label: 'Uniswap',
    href: 'https://app.uniswap.org/swap',
    description: 'Swap directly on Base, Optimism, Arbitrum, Ethereum',
  },
]

export default function ExternalTools() {
  return (
    <section className="mt-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        External tools
      </p>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((tool) => (
          <a
            key={tool.label}
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            title={tool.description}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-purple-500/50 hover:text-purple-300"
          >
            {tool.label} ↗
          </a>
        ))}
      </div>
    </section>
  )
}
