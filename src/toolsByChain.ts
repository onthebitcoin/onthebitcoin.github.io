// Quick links out to swap/DeFi apps — pure navigation, no on-chain logic
// in this app at all. The list shown depends on whichever chain is
// currently selected (selectedChain.tsx): a couple of cross-chain tools
// stay on every chain, plus a short list of apps that are actually popular
// on that specific chain. Adding a tool or a chain is just one more entry
// below — nothing else to touch.
import { arbitrum, base, ink, optimism } from 'viem/chains'

export interface ExternalTool {
  label: string
  href: string
  description: string
}

// Shown on every chain — general-purpose cross-chain aggregators.
export const MULTI_CHAIN_TOOLS: ExternalTool[] = [
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
]

// Chain-specific popular apps, shown in addition to the cross-chain tools
// above when that chain is selected.
export const CHAIN_TOOLS: Record<number, ExternalTool[]> = {
  [base.id]: [
    {
      label: 'Uniswap',
      href: 'https://app.uniswap.org/swap',
      description: 'Swap directly on Base',
    },
    {
      label: 'Aerodrome',
      href: 'https://aerodrome.finance/',
      description: "Base's leading native DEX and liquidity hub",
    },
  ],
  [ink.id]: [
    {
      label: 'Nado',
      href: 'https://app.nado.xyz/',
      description: 'All-in-one CLOB DEX for spot & perps on Ink, built by Kraken',
    },
    {
      label: 'Tydro',
      href: 'https://app.tydro.com/',
      description: 'Aave-powered lending/borrowing markets on Ink',
    },
    {
      label: 'Inkypump',
      href: 'https://inkypump.com/ink',
      description: 'Token launchpad on Ink',
    },
  ],
  [optimism.id]: [
    {
      label: 'Velodrome',
      href: 'https://velodrome.finance/',
      description: "Optimism's leading native DEX and liquidity hub",
    },
    {
      label: 'Uniswap',
      href: 'https://app.uniswap.org/swap',
      description: 'Swap directly on Optimism',
    },
  ],
  [arbitrum.id]: [
    {
      label: 'GMX',
      href: 'https://app.gmx.io/',
      description: 'Spot & perpetual trading native to Arbitrum',
    },
    {
      label: 'Camelot',
      href: 'https://app.camelot.exchange/',
      description: "Arbitrum's native DEX",
    },
    {
      label: 'Uniswap',
      href: 'https://app.uniswap.org/swap',
      description: 'Swap directly on Arbitrum',
    },
  ],
}

export function toolsForChain(chainId: number): ExternalTool[] {
  return [...MULTI_CHAIN_TOOLS, ...(CHAIN_TOOLS[chainId] ?? [])]
}
