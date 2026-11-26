// Simple multi-wallet UI: switch between the connected wallet and any
// watch-only address the user has saved. Adding a new address happens via
// the prominent "Watch address" button next to Connect Wallet
// (WatchAddressButton.tsx) — this component is just the list/switcher for
// wallets already saved.
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
    removeWallet,
    viewConnectedWallet,
    viewWallet,
  } = useViewingAddress()

  if (!isConnected && watchedWallets.length === 0) return null

  return (
    <section className="mt-4 flex flex-wrap items-center gap-2">
      {isConnected && (
        <button
          type="button"
          onClick={viewConnectedWallet}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            isConnectedWallet
              ? 'border-purple-500/50 bg-purple-500/10 text-purple-200 light:text-purple-700'
              : 'border-neutral-700 light:border-neutral-300 text-neutral-300 light:text-neutral-700 hover:border-neutral-600'
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
                : 'border-neutral-700 light:border-neutral-300'
            }`}
          >
            <button
              type="button"
              onClick={() => viewWallet(w.address)}
              className={`px-2 py-1 ${isActive ? 'text-purple-200 light:text-purple-700' : 'text-neutral-300 light:text-neutral-700 hover:text-neutral-100 light:text-neutral-900'}`}
            >
              👁 {w.label || short(w.address)}
            </button>
            <button
              type="button"
              onClick={() => removeWallet(w.address)}
              aria-label={`Stop watching ${w.address}`}
              title="Stop watching this address"
              className="px-1.5 text-neutral-600 light:text-neutral-500 hover:text-red-400"
            >
              ×
            </button>
          </div>
        )
      })}
    </section>
  )
}
