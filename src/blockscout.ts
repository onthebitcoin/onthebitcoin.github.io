// Minimal Blockscout API v2 client for recent-transactions lookup.
// Base, Ink, Optimism, and Arbitrum all run public Blockscout instances with
// the same v2 schema, so one client covers all of them (no API key needed).
// Note: Optimism's instance moved from optimism.blockscout.com (now 301s)
// to explorer.optimism.io — use that domain directly, verified working.
import { arbitrum, base, ink, optimism } from 'viem/chains'
import { fetchWithRetry, HttpError } from './net'

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

export interface ActivityPage {
  items: ActivityItem[]
  // Blockscout's own cursor for the next page, echoed back as query params
  // on the follow-up request; null means there is no more data.
  nextPageParams: Record<string, string | number> | null
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

function toActivityItem(tx: BlockscoutTxItem, address: string): ActivityItem {
  return {
    hash: tx.hash,
    timestamp: tx.timestamp,
    action: tx.method ?? (tx.value !== '0' ? 'Transfer' : 'Contract call'),
    valueWei: tx.value,
    from: tx.from.hash,
    to: tx.to?.hash ?? null,
    isOutgoing: tx.from.hash.toLowerCase() === address.toLowerCase(),
    status: tx.status ?? tx.result ?? 'unknown',
  }
}

export async function fetchRecentActivity(
  chainId: number,
  address: string,
  options: { limit?: number; pageParams?: Record<string, string | number> | null } = {},
): Promise<ActivityPage> {
  const { limit = 20, pageParams = null } = options
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  if (!chainMeta) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const query = new URLSearchParams()
  if (pageParams) {
    for (const [k, v] of Object.entries(pageParams)) query.set(k, String(v))
  }
  const qs = query.toString()
  const url = `${chainMeta.apiBase}/addresses/${address}/transactions${qs ? `?${qs}` : ''}`

  const res = await fetchWithRetry(url, {}, { timeoutMs: 10_000, retries: 1 })
  if (!res.ok) {
    if (res.status === 404) {
      // Blockscout 404s for an address with zero history on some chains —
      // treat exactly like "no transactions" rather than a hard error.
      return { items: [], nextPageParams: null }
    }
    throw new HttpError(
      res.status,
      res.status === 429
        ? 'Rate limited by the block explorer — wait a moment and retry.'
        : `Block explorer request failed (HTTP ${res.status}).`,
    )
  }
  const data: { items?: BlockscoutTxItem[]; next_page_params?: Record<string, string | number> | null } =
    await res.json()
  const items = (data.items ?? []).slice(0, limit).map((tx) => toActivityItem(tx, address))

  return {
    items,
    nextPageParams: data.next_page_params ?? null,
  }
}

export function explorerTxUrl(chainId: number, hash: string): string {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  return chainMeta ? `${chainMeta.explorerBase}/tx/${hash}` : '#'
}
