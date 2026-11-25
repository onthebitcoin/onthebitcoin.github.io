// Native + stablecoin USD prices via CoinGecko's public simple-price endpoint
// (no API key, generous free rate limit). Used to estimate portfolio USD
// value from on-chain balances — best-effort only, never blocks balance
// display if it fails.
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'

export interface TokenPrices {
  ethUsd: number | null
  usdcUsd: number | null
}

export async function fetchTokenPrices(): Promise<TokenPrices> {
  const res = await fetch(`${COINGECKO_API}?ids=ethereum,usd-coin&vs_currencies=usd`)
  if (!res.ok) {
    throw new Error(`CoinGecko request failed: ${res.status}`)
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
