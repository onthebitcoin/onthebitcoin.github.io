// Simple multi-wallet UI: switch between the connected wallet and any
// watch-only address the user has saved (paste-and-add, localStorage-backed,
// never signs anything).
import { useState, type FormEvent } from 'react'
import { useAccount } from 'wagmi'
import { useViewingAddress } from './viewingAddress'

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function WalletSwitcher() {
  const { isConnected, address: connectedAddress } = useAccount()
  const {
    address,
    isConnectedWallet,
    watchedWallets,
    addWallet,
    removeWallet,
    viewConnectedWallet,
    viewWallet,
  } = useViewingAddress()

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const result = addWallet(input)
    if (!result.ok) {
      setError(result.error ?? 'Invalid address.')
      return
    }
    setInput('')
    setError(null)
    setOpen(false)
  }

  return (
    <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-200">
          Viewing wallet
        </h2>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-neutral-400 hover:text-neutral-200"
        >
          {open ? 'Close' : '+ Add wallet to watch'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {isConnected && (
          <button
            type="button"
            onClick={viewConnectedWallet}
            className={`rounded-lg border px-3 py-1.5 text-xs transition ${
              isConnectedWallet
                ? 'border-purple-500/50 bg-purple-500/10 text-purple-200'
                : 'border-neutral-700 text-neutral-300 hover:border-neutral-600'
            }`}
          >
            🔗 Connected {connectedAddress ? `(${short(connectedAddress)})` : ''}
          </button>
        )}

        {watchedWallets.map((w) => {
          const isActive = !isConnectedWallet && address?.toLowerCase() === w.address.toLowerCase()
          return (
            <div
              key={w.address}
              className={`flex items-center gap-1 rounded-lg border px-1 py-0.5 text-xs transition ${
                isActive
                  ? 'border-purple-500/50 bg-purple-500/10'
                  : 'border-neutral-700'
              }`}
            >
              <button
                type="button"
                onClick={() => viewWallet(w.address)}
                className={`px-2 py-1 ${isActive ? 'text-purple-200' : 'text-neutral-300 hover:text-neutral-100'}`}
              >
                👁 {w.label || short(w.address)}
              </button>
              <button
                type="button"
                onClick={() => removeWallet(w.address)}
                aria-label={`Stop watching ${w.address}`}
                title="Stop watching this address"
                className="px-1.5 text-neutral-600 hover:text-red-400"
              >
                ×
              </button>
            </div>
          )
        })}

        {!isConnected && watchedWallets.length === 0 && (
          <p className="text-xs text-neutral-500">
            Add an address below to view it read-only — no wallet connection
            needed.
          </p>
        )}
      </div>

      {open && (
        <form onSubmit={handleAdd} className="mt-3 flex flex-wrap gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x... address to watch"
            className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-purple-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
          >
            Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <p className="mt-3 text-xs text-neutral-600">
        Watched addresses are read-only and saved only in this browser
        (localStorage) — never connected, never asked to sign anything.
      </p>
    </section>
  )
}
