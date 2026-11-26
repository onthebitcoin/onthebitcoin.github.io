// Current gas price per chain, via Blockscout's own `/stats` endpoint
// (same API family already used for activity/token-balances — no extra
// RPC/API key needed). Blockscout's stats response includes
// `gas_prices: { slow, average, fast }` in gwei where available.
import { BLOCKSCOUT_CHAINS } from './blockscout'
import { fetchWithRetry } from './net'

export interface GasPrice {
  slow: number | null
  average: number | null
  fast: number | null
}

interface BlockscoutStatsResponse {
  gas_prices?: {
    slow?: number | null
    average?: number | null
    fast?: number | null
  } | null
}

export async function fetchGasPrice(chainId: number): Promise<GasPrice> {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  if (!chainMeta) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const res = await fetchWithRetry(`${chainMeta.apiBase}/stats`, {}, { timeoutMs: 8_000, retries: 1 })
  if (!res.ok) throw new Error(`Gas price request failed (HTTP ${res.status}).`)

  const data: BlockscoutStatsResponse = await res.json()
  return {
    slow: data.gas_prices?.slow ?? null,
    average: data.gas_prices?.average ?? null,
    fast: data.gas_prices?.fast ?? null,
  }
}
