// Minimal Blockscout API v2 client for recent-transactions lookup.
// Base and Ink both run public Blockscout instances with the same v2 schema,
// so one client covers both chains (no API key needed, generous rate limits).
import { base, ink } from 'viem/chains'

export const BLOCKSCOUT_API_BASE: Record<number, string> = {
  [base.id]: 'https://base.blockscout.com/api/v2',
  [ink.id]: 'https://explorer.inkonchain.com/api/v2',
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
  const apiBase = BLOCKSCOUT_API_BASE[chainId]
  if (!apiBase) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const res = await fetch(`${apiBase}/addresses/${address}/transactions`)
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
  if (chainId === base.id) return `https://base.blockscout.com/tx/${hash}`
  if (chainId === ink.id) return `https://explorer.inkonchain.com/tx/${hash}`
  return '#'
}
