// App shell. Step 1: wallet connect. Step 2: multi-chain balances
// (Balances.tsx). Step 3: activity table (Activity.tsx). Step 4: OpenSea
// NFTs (Nfts.tsx). Step 5: polish (this file's footer + shared ui.tsx states).
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Balances from './Balances'
import Activity from './Activity'
import Nfts from './Nfts'

export default function App() {
  const { address, isConnected, chain } = useAccount()

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Ink & Base Activity Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Track wallet activity across Base, Ink and OpenSea.
            </p>
          </div>
          <ConnectButton />
        </header>

        <p className="mt-3 text-center text-xs text-neutral-500">
          🔒 Read-only: this app never asks for, accesses, or stores your
          private key or seed phrase. All it ever requests is your public
          address, via your wallet's normal connect/sign-in prompt.
        </p>

        <main className="mt-8 flex-1">
          {isConnected ? (
            <>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
                <p className="text-neutral-400">Connected address</p>
                <p className="mt-1 break-all font-mono text-neutral-100">
                  {address}
                </p>
                <p className="mt-3 text-neutral-400">Current chain</p>
                <p className="mt-1 text-neutral-100">
                  {chain ? `${chain.name} (id ${chain.id})` : 'Unknown'}
                </p>
              </div>
              <Balances />
              <Activity />
              <Nfts />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-neutral-400">
              Connect a wallet to see Base/Ink balances, recent activity and
              OpenSea NFTs.
            </div>
          )}
        </main>

        <footer className="mt-10 border-t border-neutral-800 pt-4 text-center text-xs text-neutral-500">
          Built with React, wagmi &amp; RainbowKit. Data from Blockscout
          (Base &amp; Ink) and the OpenSea API. Local-first — no backend, no
          data leaves your browser except direct calls to those public APIs.
        </footer>
      </div>
    </div>
  )
}
