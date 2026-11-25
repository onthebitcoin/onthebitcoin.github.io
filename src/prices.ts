// Native + stablecoin USD prices via CoinGecko's public simple-price endpoint
// (no API key, generous free rate limit). Used to estimate portfolio USD
// value from on-chain balances — best-effort only, never blocks balance
// display if it fails.
import { fetchWithRetry, HttpError } from './net'

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'

export interface TokenPrices {
  ethUsd: number | null
  usdcUsd: number | null
}

export async function fetchTokenPrices(): Promise<TokenPrices> {
  // Short timeout: prices are a nice-to-have overlay on top of balances
  // that already loaded, so don't make the user wait long for them.
  const res = await fetchWithRetry(
    `${COINGECKO_API}?ids=ethereum,usd-coin&vs_currencies=usd`,
    {},
    { timeoutMs: 6_000, retries: 1 },
  )
  if (!res.ok) {
    throw new HttpError(
      res.status,
      res.status === 429
        ? 'Rate limited by CoinGecko — prices will retry shortly.'
        : `CoinGecko request failed (HTTP ${res.status}).`,
    )
  }
  const data: { ethereum?: { usd?: number }; 'usd-coin'?: { usd?: number } } =
    await res.json()

  return {
    ethUsd: data.ethereum?.usd ?? null,
    usdcUsd: data['usd-coin']?.usd ?? null,
  }
}

// WETH/WETH9 track ETH 1:1, so they reuse the native ETH price.
export function priceForSymbol(symbol: string, prices: TokenPrices): number | null {
  if (symbol === 'USDC') return prices.usdcUsd
  if (symbol.startsWith('WETH')) return prices.ethUsd
  return null
}

export function formatUsd(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}
