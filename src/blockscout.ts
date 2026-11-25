// Minimal Blockscout API v2 client for recent-transactions lookup.
// Base, Ink, Optimism, and Arbitrum all run public Blockscout instances with
// the same v2 schema, so one client covers all of them (no API key needed).
// Note: Optimism's instance moved from optimism.blockscout.com (now 301s)
// to explorer.optimism.io — use that domain directly, verified working.
import { arbitrum, base, ink, optimism } from 'viem/chains'

interface BlockscoutChainMeta {
  apiBase: string
  explorerBase: string
}

export const BLOCKSCOUT_CHAINS: Record<number, BlockscoutChainMeta> = {
  [base.id]: {
    apiBase: 'https://base.blockscout.com/api/v2',
    explorerBase: 'https://base.blockscout.com',
  },
  [ink.id]: {
    apiBase: 'https://explorer.inkonchain.com/api/v2',
    explorerBase: 'https://explorer.inkonchain.com',
  },
  [optimism.id]: {
    apiBase: 'https://explorer.optimism.io/api/v2',
    explorerBase: 'https://explorer.optimism.io',
  },
  [arbitrum.id]: {
    apiBase: 'https://arbitrum.blockscout.com/api/v2',
    explorerBase: 'https://arbitrum.blockscout.com',
  },
}

export interface ActivityItem {
  hash: string
  timestamp: string | null
  action: string
  valueWei: string
  from: string
  to: string | null
  isOutgoing: boolean
  status: string
}

interface BlockscoutTxItem {
  hash: string
  timestamp: string | null
  method: string | null
  value: string
  from: { hash: string }
  to: { hash: string } | null
  status: string | null
  result: string | null
  decoded_input?: { method_call?: string } | null
}

export async function fetchRecentActivity(
  chainId: number,
  address: string,
  limit = 10,
): Promise<ActivityItem[]> {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  if (!chainMeta) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const res = await fetch(`${chainMeta.apiBase}/addresses/${address}/transactions`)
  if (!res.ok) {
    throw new Error(`Blockscout request failed: ${res.status}`)
  }
  const data: { items?: BlockscoutTxItem[] } = await res.json()
  const items = data.items ?? []

  return items.slice(0, limit).map((tx) => ({
    hash: tx.hash,
    timestamp: tx.timestamp,
    action: tx.method ?? (tx.value !== '0' ? 'Transfer' : 'Contract call'),
    valueWei: tx.value,
    from: tx.from.hash,
    to: tx.to?.hash ?? null,
    isOutgoing: tx.from.hash.toLowerCase() === address.toLowerCase(),
    status: tx.status ?? tx.result ?? 'unknown',
  }))
}

export function explorerTxUrl(chainId: number, hash: string): string {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  return chainMeta ? `${chainMeta.explorerBase}/tx/${hash}` : '#'
}
