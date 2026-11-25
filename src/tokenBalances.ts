// Full ERC-20 token-balance lookup via Blockscout API v2
// (/addresses/{address}/token-balances) — returns every token the address
// actually holds, not just a hardcoded shortlist. Each entry already
// includes Blockscout's own `exchange_rate` (their own USD price feed), so
// there's no need to map arbitrary token symbols to a CoinGecko id just to
// get a price: Blockscout's rate covers the long tail far better than a
// hand-picked list ever could, and is already scoped per-chain the same
// way activity/NFTs are. Tokens Blockscout has no rate for simply show "—"
// for USD value, per the brief.
import { BLOCKSCOUT_CHAINS } from './blockscout'
import { fetchWithRetry, HttpError } from './net'

export interface TokenBalance {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  amount: number
  usdValue: number | null
  iconUrl: string | null
}

interface BlockscoutTokenBalanceItem {
  token: {
    address_hash: string
    symbol: string | null
    name: string | null
    decimals: string | null
    exchange_rate: string | null
    icon_url: string | null
    type: string
  }
  token_id: string | null
  value: string
}

export async function fetchTokenBalances(
  chainId: number,
  address: string,
): Promise<TokenBalance[]> {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  if (!chainMeta) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const res = await fetchWithRetry(
    `${chainMeta.apiBase}/addresses/${address}/token-balances`,
    {},
    { timeoutMs: 12_000, retries: 1 },
  )
  if (!res.ok) {
    if (res.status === 404) return [] // no token activity at all for this address
    throw new HttpError(
      res.status,
      res.status === 429
        ? 'Rate limited by the block explorer — wait a moment and retry.'
        : `Block explorer request failed (HTTP ${res.status}).`,
    )
  }

  const items: BlockscoutTokenBalanceItem[] = await res.json()

  return items
    .filter((item) => item.token.type === 'ERC-20' && item.token_id === null)
    .map((item): TokenBalance | null => {
      const decimals = Number(item.token.decimals ?? '18')
      const rawValue = (() => {
        try {
          return BigInt(item.value)
        } catch {
          return 0n
        }
      })()
      if (rawValue === 0n) return null // skip zero-balance dust entries

      const amount = Number(rawValue) / 10 ** decimals
      const rate = item.token.exchange_rate ? Number(item.token.exchange_rate) : null
      const usdValue = rate !== null && Number.isFinite(rate) ? amount * rate : null

      return {
        address: item.token.address_hash as `0x${string}`,
        symbol: item.token.symbol ?? '???',
        name: item.token.name ?? 'Unknown token',
        decimals,
        amount,
        usdValue,
        iconUrl: item.token.icon_url,
      }
    })
    .filter((t): t is TokenBalance => t !== null)
    .sort((a, b) => {
      // Priced tokens first (highest USD value first), unpriced tokens
      // after (there's no meaningful order for those, so leave as-is).
      if (a.usdValue !== null && b.usdValue !== null) return b.usdValue - a.usdValue
      if (a.usdValue !== null) return -1
      if (b.usdValue !== null) return 1
      return 0
    })
}
