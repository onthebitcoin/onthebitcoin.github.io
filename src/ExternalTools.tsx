// Quick links out to swap/DeFi apps — pure navigation, no on-chain logic in
// this app at all. Shows the cross-chain tools plus whichever apps are
// actually popular on the currently-selected chain (externalTools.ts). Works
// identically whether a wallet is connected or an address is only being
// watched — this section doesn't depend on `address` at all.
import { toolsForChain } from './toolsByChain'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'

export default function ExternalTools() {
  const { chainId } = useSelectedChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)
  const tools = toolsForChain(chainId)

  return (
    <section className="mt-6">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Tools on {chainMeta?.name ?? 'this chain'}
      </p>
      <div className="flex flex-wrap gap-2">
        {tools.map((tool) => (
          <a
            key={tool.label}
            href={tool.href}
            target="_blank"
            rel="noreferrer"
            title={tool.description}
            className="rounded-lg border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white px-3 py-1.5 text-sm text-neutral-300 light:text-neutral-700 transition hover:border-purple-500/50 hover:text-purple-300"
          >
            {tool.label} ↗
          </a>
        ))}
      </div>
    </section>
  )
}
