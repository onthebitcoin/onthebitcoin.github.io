// App shell. Single-chain-at-a-time UX: ChainTabs picks one chain
// (selectedChain.tsx); Balances/Activity/Nfts each render only that chain's
// data and lift a small summary up via callback so WalletAnalysis can show
// a combined view without re-fetching anything itself. Multi-wallet
// (WatchAddressButton.tsx + WalletSwitcher.tsx + viewingAddress.tsx) works
// identically whether a real wallet is connected or not.
import { Fragment, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Balances from './Balances'
import Activity from './Activity'
import Nfts from './Nfts'
import WalletSwitcher from './WalletSwitcher'
import WatchAddressButton from './WatchAddressButton'
import ExternalTools from './ExternalTools'
import AddressActions from './AddressActions'
import ChainTabs from './ChainTabs'
import WalletAnalysis, { type AnalysisData } from './WalletAnalysis'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { useTheme } from './theme'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border border-neutral-700 light:border-neutral-300 px-2.5 py-2 text-sm text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

export default function App() {
  const { chain } = useAccount()
  const { address, isConnectedWallet } = useViewingAddress()
  const { chainId } = useSelectedChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!

  // Summary numbers lifted from Balances/Activity/Nfts for the Wallet
  // Analysis panel. Each section reports null while loading its own data,
  // and the real value once resolved.
  const [usdTotal, setUsdTotal] = useState<number | null>(null)
  const [activitySummary, setActivitySummary] = useState<{
    total: number
    sentCount: number
    receivedCount: number
  } | null>(null)
  const [nftCount, setNftCount] = useState<number | null>(null)

  // No parent-level reset effect here: Balances/Activity/Nfts are grouped
  // in a single keyed Fragment below, so switching chain/address fully
  // remounts all three together and they naturally start at null/real
  // values on their own. A parent reset effect was tried here before and
  // had to be removed again — it ran in the same commit as the freshly
  // mounted children and could clobber a child's real first value (e.g.
  // Nfts deliberately reports a definite 0 for Ink, not null/unknown, and
  // the parent's reset fired right after and overwrote it back to null).

  const analysisData: AnalysisData = {
    usdTotal,
    txCount: activitySummary?.total ?? null,
    sentCount: activitySummary?.sentCount ?? null,
    receivedCount: activitySummary?.receivedCount ?? null,
    nftCount,
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 light:bg-neutral-50 text-neutral-100 light:text-neutral-900">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6 py-8 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-neutral-800 light:border-neutral-300 pb-7">
          <div className="flex items-center gap-4">
            <img
              src="/images/otb-r1c.png"
              alt="OnTheBitcoin logo"
              className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl shadow-lg ring-1 ring-purple-500/20"
            />
            <div>
              <h1 className="flex items-center gap-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
                OnTheBitcoin <span aria-hidden="true">🌈</span>
              </h1>
              <p className="mt-1 text-base font-medium text-purple-300 light:text-purple-700">
                Bitcoin is the answer.
              </p>
              <p className="mt-1 text-sm text-neutral-400 light:text-neutral-600">
                Multi-chain wallet dashboard — balances, activity &amp; NFTs
                in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WatchAddressButton />
            <ConnectButton />
            <ThemeToggle />
          </div>
        </header>

        <p className="mt-3 text-center text-xs text-neutral-400">
          🔒 Read-only — never accesses your private key or seed phrase.
        </p>

        <WalletSwitcher />

        <ExternalTools />

        <main className="mt-8 flex-1">
          {address ? (
            <>
              <div className="rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white p-5 sm:p-6 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Viewing address</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isConnectedWallet
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-neutral-700/50 text-neutral-300 light:text-neutral-700'
                      }`}
                    >
                      {isConnectedWallet ? 'Connected' : 'Watch-only'}
                    </span>
                    <AddressActions address={address} />
                  </div>
                </div>
                <p className="mt-2 break-all font-mono text-base sm:text-lg font-medium text-neutral-100 light:text-neutral-900">
                  {address}
                </p>
                {isConnectedWallet && (
                  <>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Current chain</p>
                    <p className="mt-1 text-neutral-100 light:text-neutral-900">
                      {chain ? `${chain.name} (id ${chain.id})` : 'Unknown'}
                    </p>
                  </>
                )}
              </div>

              <ChainTabs />

              <WalletAnalysis chainName={chainMeta.name} data={analysisData} />

              {/* One key on a single wrapping Fragment, not on each child
                  individually — giving 3 sibling elements of DIFFERENT
                  component types the exact same key string caused React
                  to occasionally mount the new chain's Balances/Activity
                  as EXTRA siblings alongside the old chain's (confirmed via
                  React DevTools fiber inspection: two live fibers with
                  different keys coexisting under the same parent), instead
                  of cleanly replacing them. A single key boundary avoids
                  that edge case entirely, forces one clean
                  unmount+remount of the whole group together, and is what
                  actually fixes "Wallet Analysis shows stale numbers from
                  the previous chain" — the old bug: a lingering old-chain
                  instance's onSummary/onUsdTotal/onCount callback could
                  still fire after switching chains and clobber the new
                  chain's just-reported values. */}
              <Fragment key={`${chainId}-${address}`}>
                <Balances onUsdTotal={setUsdTotal} />
                <Activity onSummary={setActivitySummary} />
                <Nfts onCount={setNftCount} />
              </Fragment>
            </>
          ) : (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-xl border border-neutral-800 light:border-neutral-300">
                <img
                  src="/images/onthebitcoin-banner@2x.png"
                  alt="OnTheBitcoin — Noise or signal? Markets, Crypto, AI, Tech, Macro"
                  className="aspect-[3/1] w-full object-cover"
                />
              </div>
              <div className="rounded-xl border border-dashed border-neutral-800 light:border-neutral-300 p-10 text-center text-neutral-400 light:text-neutral-600">
                <p className="text-neutral-300 light:text-neutral-700">
                  A free tool by{' '}
                  <span className="font-semibold text-neutral-100 light:text-neutral-900">
                    OnTheBitcoin
                  </span>{' '}
                  for tracking your own wallets.
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                  Connect a wallet, or click "Watch address" above, to see
                  balances and activity on Base, Ink, Optimism &amp;
                  Arbitrum, plus OpenSea NFTs — all read-only, nothing leaves
                  your browser.
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-10 border-t border-neutral-800 light:border-neutral-300 pt-4 text-center text-xs text-neutral-400">
          <p className="text-sm text-neutral-300 light:text-neutral-700">
            A product by{' '}
            <span className="font-semibold text-neutral-100 light:text-neutral-900">
              OnTheBitcoin
            </span>{' '}
            · Bitcoin is the answer.
          </p>
          <p className="mt-1.5 text-neutral-400 light:text-neutral-500">
            Built with React, wagmi &amp; RainbowKit. Data from Blockscout
            (Base, Ink, Optimism &amp; Arbitrum) and the OpenSea API.
            Local-first — no backend, no data leaves your browser except
            direct calls to those public APIs.
          </p>
        </footer>
      </div>
    </div>
  )
}
