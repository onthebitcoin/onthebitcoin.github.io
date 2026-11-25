// Known ERC-20 token addresses for the chains we support.
// Base: official Circle USDC + canonical WETH predeploy.
// Ink: official Circle-native USDC + WETH9 (same predeploy address as other
// OP-stack chains) + USDT0, per Ink's own contracts page.
import { base } from 'viem/chains'
import { ink } from 'viem/chains'

export interface TokenInfo {
  symbol: string
  address: `0x${string}`
  decimals: number
}

export const TOKENS_BY_CHAIN: Record<number, TokenInfo[]> = {
  [base.id]: [
    {
      symbol: 'USDC',
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
    },
    {
      symbol: 'WETH',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
    },
  ],
  [ink.id]: [
    {
      symbol: 'USDC',
      address: '0x2D270e6886d130D724215A266106e6832161EAEd',
      decimals: 6,
    },
    {
      symbol: 'WETH9',
      address: '0x4200000000000000000000000000000000000006',
      decimals: 18,
    },
  ],
}
