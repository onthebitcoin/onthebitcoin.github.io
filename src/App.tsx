// App shell. Single-chain-at-a-time UX: ChainTabs picks one chain
// (selectedChain.tsx); Balances/Activity/Nfts each render only that chain's
// data and lift a small summary up via callback so WalletAnalysis can show
// a combined view without re-fetching anything itself. Multi-wallet
// (WatchAddressButton.tsx + WalletSwitcher.tsx + viewingAddress.tsx) works
// identically whether a real wallet is connected or not.
import { useState } from 'react'
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

export default function App() {
  const { chain } = useAccount()
  const { address, isConnectedWallet } = useViewingAddress()
  const { chainId } = useSelectedChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!

  // Summary numbers lifted from Balances/Activity/Nfts for the Wallet
  // Analysis panel. Each section is responsible for reporting null while
  // it's loading its own data for the newly selected chain/address, and the
  // real value once resolved — deliberately NOT reset here too, since that
  // used to race with a child's own effect (children's effects fire before
  // a parent's in the same commit, so a parent-level reset could silently
  // clobber a child's freshly-reported value, e.g. NFT count on Ink always
  // showing "unknown" instead of "0").
  const [usdTotal, setUsdTotal] = useState<number | null>(null)
  const [activitySummary, setActivitySummary] = useState<{
    total: number
    sentCount: number
    receivedCount: number
  } | null>(null)
  const [nftCount, setNftCount] = useState<number | null>(null)

  const analysisData: AnalysisData = {
    usdTotal,
    txCount: activitySummary?.total ?? null,
    sentCount: activitySummary?.sentCount ?? null,
    receivedCount: activitySummary?.receivedCount ?? null,
    nftCount,
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <WatchAddressButton />
            <ConnectButton />
          </div>
        </header>

        <p className="mt-3 text-center text-xs text-neutral-500">
          🔒 Read-only — never accesses your private key or seed phrase.
        </p>

        <WalletSwitcher />

        <ExternalTools />

        <main className="mt-8 flex-1">
          {address ? (
            <>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-neutral-400">Viewing address</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        isConnectedWallet
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-neutral-700/50 text-neutral-300'
                      }`}
                    >
                      {isConnectedWallet ? 'Connected' : 'Watch-only'}
                    </span>
                    <AddressActions address={address} />
                  </div>
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

              <ChainTabs />

              <WalletAnalysis chainName={chainMeta.name} data={analysisData} />

              <Balances onUsdTotal={setUsdTotal} />
              <Activity onSummary={setActivitySummary} />
              <Nfts onCount={setNftCount} />
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
                  Connect a wallet, or click "Watch address" above, to see
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
