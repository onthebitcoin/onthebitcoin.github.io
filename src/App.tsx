// App shell. Step 1: wallet connect. Step 2: multi-chain balances
// (Balances.tsx). Step 3: activity table (Activity.tsx). Step 4: OpenSea
// NFTs (Nfts.tsx). Step 5+: polish, branding (onthebitcoin), multi-wallet
// (WalletSwitcher.tsx + viewingAddress.tsx).
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Balances from './Balances'
import Activity from './Activity'
import Nfts from './Nfts'
import WalletSwitcher from './WalletSwitcher'
import { useViewingAddress } from './viewingAddress'

export default function App() {
  const { chain } = useAccount()
  const { address, isConnectedWallet } = useViewingAddress()

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <img
              src="/images/otb-r1c.png"
              alt="onthebitcoin logo"
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                onthebitcoin
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Multi-chain wallet dashboard — balances, activity &amp; NFTs
                in one place.
              </p>
            </div>
          </div>
          <ConnectButton />
        </header>

        <p className="mt-3 text-center text-xs text-neutral-500">
          🔒 Read-only — never accesses your private key or seed phrase.
        </p>

        <WalletSwitcher />

        <main className="mt-8 flex-1">
          {address ? (
            <>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-neutral-400">Viewing address</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      isConnectedWallet
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-700/50 text-neutral-300'
                    }`}
                  >
                    {isConnectedWallet ? 'Connected' : 'Watch-only'}
                  </span>
                </div>
                <p className="mt-1 break-all font-mono text-neutral-100">
                  {address}
                </p>
                {isConnectedWallet && (
                  <>
                    <p className="mt-3 text-neutral-400">Current chain</p>
                    <p className="mt-1 text-neutral-100">
                      {chain ? `${chain.name} (id ${chain.id})` : 'Unknown'}
                    </p>
                  </>
                )}
              </div>
              <Balances />
              <Activity />
              <Nfts />
            </>
          ) : (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-neutral-800">
                <img
                  src="/images/onthebitcoin-banner@2x.png"
                  alt="onthebitcoin — Noise or signal? Markets, Crypto, AI, Tech, Macro"
                  className="aspect-[3/1] w-full object-cover"
                />
              </div>
              <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
                <p className="text-neutral-300">
                  A free tool by{' '}
                  <span className="font-semibold text-neutral-100">
                    onthebitcoin
                  </span>{' '}
                  for tracking your own wallets.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                  Connect a wallet, or add an address to watch above, to see
                  balances and activity on Base, Ink, Optimism &amp;
                  Arbitrum, plus OpenSea NFTs — all read-only, nothing leaves
                  your browser.
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-10 border-t border-neutral-800 pt-4 text-center text-xs text-neutral-500">
          A product by <span className="text-neutral-300">onthebitcoin</span>.
          Built with React, wagmi &amp; RainbowKit. Data from Blockscout
          (Base, Ink, Optimism &amp; Arbitrum) and the OpenSea API.
          Local-first — no backend, no data leaves your browser except direct
          calls to those public APIs.
        </footer>
      </div>
    </div>
  )
}
