// Single-chain balance section for whichever chain is currently selected
// (ChainTabs / selectedChain.tsx): native balance (wagmi's useBalance) plus
// every ERC-20 token the address actually holds (Blockscout's
// token-balances endpoint, tokenBalances.ts) — not a hardcoded shortlist.
// Blockscout already supplies a USD exchange rate per token where it has
// one, so that's used directly instead of trying to map arbitrary token
// symbols to a CoinGecko id (unreliable for a long tail of random tokens).
// Native ETH still prices via CoinGecko since the token-balances endpoint
// only covers ERC-20s. Capped to the top 20 tokens by USD value so a wallet
// holding hundreds of spam/dust tokens doesn't render (or fetch) all of them.
import { useEffect, useMemo, useState } from 'react'
import { useAccount, useBalance, useSwitchChain } from 'wagmi'
import { formatUnits } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { fetchTokenBalances, type TokenBalance } from './tokenBalances'
import { fetchTokenPrices, formatUsd } from './prices'
import { explorerTokenUrl } from './blockscout'
import { fetchGasPrice } from './gasPrice'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { downloadCsv } from './csv'
import { Skeleton, ErrorState, useSlowLoading, shortAddress, CopyButton, DataSourceNote } from './ui'
import PortfolioChart, { type ChartSlice } from './PortfolioChart'

const TOP_N_TOKENS = 20
const HIDE_SMALL_THRESHOLD_USD = 1
const HIDE_SMALL_STORAGE_KEY = 'onthebitcoin:hide-small-balances'

function loadHideSmall(): boolean {
  try {
    return localStorage.getItem(HIDE_SMALL_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Asks the connected injected wallet (MetaMask, Coinbase Wallet, etc.) to
// add this token to its UI via EIP-747 `wallet_watchAsset`. This only
// affects what the wallet *displays* — it cannot move funds, approve
// anything, or need a private key, so it's safe to expose with one click.
async function addTokenToWallet(params: {
  address: `0x${string}`
  symbol: string
  decimals: number
}) {
  const ethereum = (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum
  if (!ethereum) return
  try {
    await ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: params.address,
          symbol: params.symbol,
          decimals: params.decimals,
        },
      },
    })
  } catch {
    // User declined or wallet doesn't support it — not an app error, nothing to show.
  }
}

function GasPriceBadge({ chainId }: { chainId: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['gas-price', chainId],
    queryFn: () => fetchGasPrice(chainId),
    staleTime: 30_000,
    retry: 1,
  })

  if (isLoading || isError || data?.average == null) return null

  return (
    <span
      title="Current average gas price on this chain"
      className="rounded-full border border-neutral-700 light:border-neutral-300 px-2 py-0.5 text-[11px] text-neutral-400 light:text-neutral-600"
    >
      ⛽ ~{data.average.toFixed(3)} gwei
    </span>
  )
}

function TokenRow({
  token,
  chainId,
  showAddToWallet,
}: {
  token: TokenBalance
  chainId: number
  showAddToWallet: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-1 border-t border-neutral-800/60 light:border-neutral-300/60 py-2.5 text-sm first:border-t-0">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-neutral-300 light:text-neutral-700">
          {token.iconUrl && (
            <img src={token.iconUrl} alt="" className="h-4 w-4 rounded-full" />
          )}
          <span title={token.name} className="font-medium">
            {token.symbol}
          </span>
          {showAddToWallet && (
            <button
              type="button"
              title={`Add ${token.symbol} to wallet`}
              onClick={() => addTokenToWallet(token)}
              className="rounded border border-neutral-700 light:border-neutral-300 px-1 text-[10px] leading-4 text-neutral-500 hover:border-purple-500 hover:text-purple-300"
            >
              +wallet
            </button>
          )}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-600 light:text-neutral-500">
          <span className="font-mono">{shortAddress(token.address)}</span>
          <CopyButton value={token.address} label="Copy" />
          <a
            href={explorerTokenUrl(chainId, token.address)}
            target="_blank"
            rel="noreferrer"
            className="hover:text-purple-300 hover:underline"
          >
            View ↗
          </a>
        </div>
      </div>
      <span className="text-right">
        <span className="font-mono text-neutral-100 light:text-neutral-900">
          {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </span>
        <span className="ml-1.5 text-xs text-neutral-500">
          {formatUsd(token.usdValue)}
        </span>
      </span>
    </div>
  )
}

export default function Balances({
  onUsdTotal,
}: {
  onUsdTotal?: (usd: number | null) => void
}) {
  const { address, isConnectedWallet } = useViewingAddress()
  const { chainId } = useSelectedChain()
  const { chain: activeChain } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!

  const [search, setSearch] = useState('')
  const [hideSmall, setHideSmall] = useState(loadHideSmall)

  useEffect(() => {
    try {
      localStorage.setItem(HIDE_SMALL_STORAGE_KEY, String(hideSmall))
    } catch {
      // not critical — just won't persist across sessions
    }
  }, [hideSmall])

  const { data: prices, isLoading: pricesLoading, isError: pricesError, refetch: refetchPrices } = useQuery({
    queryKey: ['token-prices'],
    queryFn: fetchTokenPrices,
    staleTime: 60_000,
    retry: 1,
  })

  const {
    data: native,
    isLoading: nativeLoading,
    isError: nativeError,
    refetch: refetchNative,
  } = useBalance({ address, chainId })

  const {
    data: tokens,
    isLoading: tokensLoading,
    isError: tokensError,
    error: tokensErrorObj,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ['token-balances', chainId, address],
    queryFn: () => fetchTokenBalances(chainId, address!),
    enabled: Boolean(address),
    staleTime: 30_000,
  })

  const showSlowNativeHint = useSlowLoading(nativeLoading, 1500)
  const showSlowTokensHint = useSlowLoading(tokensLoading, 1500)

  const nativeAmount = native ? Number(formatUnits(native.value, native.decimals)) : null
  const nativePrice = prices?.ethUsd ?? null
  const nativeUsd = nativeAmount !== null && nativePrice !== null ? nativeAmount * nativePrice : null

  const topTokens = (tokens ?? []).slice(0, TOP_N_TOKENS)
  const hiddenCount = (tokens?.length ?? 0) - topTokens.length

  // Totals and the chart always reflect the FULL top-20 list regardless of
  // the search box or "hide small balances" toggle — those are display
  // filters only, never affect the numbers reported elsewhere (CSV, Wallet
  // Analysis, the chart).
  const knownUsdValues = [
    ...(nativeUsd !== null ? [nativeUsd] : []),
    ...topTokens.map((t) => t.usdValue).filter((v): v is number => v !== null),
  ]
  const total = knownUsdValues.length > 0 ? knownUsdValues.reduce((a, b) => a + b, 0) : null

  useEffect(() => {
    onUsdTotal?.(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const visibleTokens = useMemo(() => {
    const q = search.trim().toLowerCase()
    return topTokens.filter((t) => {
      if (hideSmall && (t.usdValue ?? 0) < HIDE_SMALL_THRESHOLD_USD) return false
      if (!q) return true
      return (
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
      )
    })
  }, [topTokens, search, hideSmall])

  const chartSlices: ChartSlice[] = useMemo(() => {
    const priced: ChartSlice[] = [
      ...(nativeUsd !== null && nativeUsd > 0
        ? [{ label: `${chainMeta.nativeCurrency.symbol} (native)`, value: nativeUsd }]
        : []),
      ...topTokens
        .filter((t) => t.usdValue !== null && t.usdValue > 0)
        .map((t) => ({ label: t.symbol, value: t.usdValue! })),
    ].sort((a, b) => b.value - a.value)

    const TOP_N_SLICES = 7
    if (priced.length <= TOP_N_SLICES) return priced
    const top = priced.slice(0, TOP_N_SLICES - 1)
    const otherValue = priced.slice(TOP_N_SLICES - 1).reduce((sum, s) => sum + s.value, 0)
    return [...top, { label: 'Other', value: otherValue }]
  }, [nativeUsd, topTokens, chainMeta.nativeCurrency.symbol])

  // "Active"/"Switch" only make sense for the real connected wallet — a
  // watch-only address isn't "on" any chain, it's just an address we read
  // balances for, so we hide chain-switching chrome for it entirely.
  const isActive = isConnectedWallet && activeChain?.id === chainId

  function handleExport() {
    if (!address) return
    const rows = [
      {
        chain: chainMeta.name,
        symbol: `${chainMeta.nativeCurrency.symbol} (native)`,
        contract: 'native',
        amount: nativeAmount ?? '',
        usdValue: nativeUsd !== null ? nativeUsd.toFixed(2) : '',
      },
      ...topTokens.map((t) => ({
        chain: chainMeta.name,
        symbol: t.symbol,
        contract: t.address,
        amount: t.amount,
        usdValue: t.usdValue !== null ? t.usdValue.toFixed(2) : '',
      })),
    ]
    downloadCsv(
      `onthebitcoin-balances-${chainMeta.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      rows,
    )
  }

  if (!address) return null

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-200 light:text-neutral-800">
            Balances — {chainMeta.name}
          </h2>
          <DataSourceNote>
            Token balances from Blockscout · prices from CoinGecko
          </DataSourceNote>
        </div>
        <div className="flex items-center gap-2">
          <GasPriceBadge chainId={chainId} />
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-neutral-700 light:border-neutral-300 px-2 py-1 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-100 light:text-neutral-900">{chainMeta.name}</h3>
            <p className="text-xs text-neutral-500">
              {formatUsd(total)} est. value
              {pricesLoading && ' · loading ETH price…'}
              {pricesError && (
                <>
                  {' '}
                  · ETH price unavailable —{' '}
                  <button
                    type="button"
                    onClick={() => refetchPrices()}
                    className="underline hover:text-purple-300"
                  >
                    retry
                  </button>
                </>
              )}
            </p>
          </div>
          {isConnectedWallet &&
            (isActive ? (
              <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-xs text-purple-300 light:text-purple-700">
                Active
              </span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => switchChain({ chainId })}
                className="rounded-lg border border-neutral-700 light:border-neutral-300 px-2.5 py-1 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50"
              >
                {isPending ? 'Switching…' : 'Switch wallet to this chain'}
              </button>
            ))}
        </div>

        {chartSlices.length > 0 && (
          <div className="mt-4 border-t border-neutral-800 light:border-neutral-300 pt-4">
            <PortfolioChart slices={chartSlices} />
          </div>
        )}

        <div className="mt-4 border-t border-neutral-800 light:border-neutral-300 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-y-1 pb-2.5 text-sm">
            <div>
              <span className="font-medium text-neutral-300 light:text-neutral-700">
                {chainMeta.nativeCurrency.symbol}
              </span>
              <div className="mt-0.5 text-[11px] text-neutral-600 light:text-neutral-500">
                Native token — no contract address
              </div>
            </div>
            {nativeLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : nativeError ? (
              <button
                type="button"
                onClick={() => refetchNative()}
                className="text-xs text-red-400 hover:underline"
              >
                error — retry
              </button>
            ) : (
              <span className="text-right">
                <span className="font-mono text-neutral-100 light:text-neutral-900">
                  {nativeAmount !== null ? nativeAmount.toFixed(5) : '0.00000'}
                </span>
                <span className="ml-1.5 text-xs text-neutral-500">
                  {formatUsd(nativeUsd)}
                </span>
              </span>
            )}
          </div>

          {tokensLoading && (
            <div className="space-y-1.5 border-t border-neutral-800/60 light:border-neutral-300/60 py-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              {showSlowTokensHint && (
                <p className="pt-1 text-xs text-neutral-500">
                  Loading token balances on {chainMeta.name}…
                </p>
              )}
            </div>
          )}

          {tokensError && (
            <ErrorState
              message={`Could not load token balances: ${
                tokensErrorObj instanceof Error ? tokensErrorObj.message : 'unknown error'
              }`}
              onRetry={() => refetchTokens()}
            />
          )}

          {!tokensLoading && !tokensError && topTokens.length === 0 && (
            <p className="border-t border-neutral-800/60 light:border-neutral-300/60 py-2.5 text-xs text-neutral-500">
              No ERC-20 tokens found on {chainMeta.name} for this address.
            </p>
          )}

          {!tokensLoading && !tokensError && topTokens.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-800/60 light:border-neutral-300/60 pt-2.5 pb-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tokens by name or contract…"
                  className="min-w-0 flex-1 rounded-lg border border-neutral-700 light:border-neutral-300 bg-neutral-950 light:bg-neutral-50 px-2.5 py-1.5 text-xs text-neutral-100 light:text-neutral-900 placeholder:text-neutral-600 focus:border-purple-500 focus:outline-none"
                />
                <label className="flex items-center gap-1.5 text-xs text-neutral-400 light:text-neutral-600">
                  <input
                    type="checkbox"
                    checked={hideSmall}
                    onChange={(e) => setHideSmall(e.target.checked)}
                    className="h-3.5 w-3.5 accent-purple-500"
                  />
                  Hide &lt; ${HIDE_SMALL_THRESHOLD_USD}
                </label>
              </div>

              <p className="pb-1 text-xs text-neutral-500">
                {topTokens.length} token{topTokens.length === 1 ? '' : 's'} with balance
                {hiddenCount > 0 && ` (showing top ${TOP_N_TOKENS} by USD value)`}
                {visibleTokens.length !== topTokens.length &&
                  ` — ${visibleTokens.length} shown after filter`}
              </p>

              {visibleTokens.length === 0 ? (
                <p className="border-t border-neutral-800/60 light:border-neutral-300/60 py-2.5 text-xs text-neutral-500">
                  No tokens match the current search / filter.
                </p>
              ) : (
                visibleTokens.map((t) => (
                  <TokenRow key={t.address} token={t} chainId={chainId} showAddToWallet={isActive} />
                ))
              )}

              {hiddenCount > 0 && (
                <p className="border-t border-neutral-800/60 light:border-neutral-300/60 pt-1.5 text-xs text-neutral-600 light:text-neutral-500">
                  +{hiddenCount} more token{hiddenCount === 1 ? '' : 's'} not shown. Token
                  list may be incomplete for wallets holding many obscure
                  tokens.
                </p>
              )}
            </>
          )}
        </div>

        {nativeLoading && showSlowNativeHint && (
          <p className="mt-2 text-xs text-neutral-500">
            Loading {chainMeta.name} balance…
          </p>
        )}
      </div>
    </section>
  )
}
