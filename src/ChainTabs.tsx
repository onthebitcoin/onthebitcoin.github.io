// Chain tabs: pick exactly one chain to view at a time. Horizontally
// scrollable so it never wraps awkwardly on mobile.
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'

export default function ChainTabs() {
  const { chainId, setChainId } = useSelectedChain()

  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {SUPPORTED_CHAINS.map((c) => {
        const isActive = c.id === chainId
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => setChainId(c.id)}
            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-purple-500 bg-purple-500/15 text-purple-200'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
            }`}
          >
            {c.name}
          </button>
        )
      })}
    </div>
  )
}
