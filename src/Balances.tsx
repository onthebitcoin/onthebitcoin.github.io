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
import { useEffect } from 'react'
import { useAccount, useBalance, useSwitchChain } from 'wagmi'
import { formatUnits } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { fetchTokenBalances, type TokenBalance } from './tokenBalances'
import { fetchTokenPrices, formatUsd } from './prices'
import { explorerTokenUrl } from './blockscout'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { downloadCsv } from './csv'
import { Skeleton, ErrorState, useSlowLoading, shortAddress, CopyButton, DataSourceNote } from './ui'

const TOP_N_TOKENS = 20

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
    <div className="flex flex-wrap items-center justify-between gap-y-1 border-t border-neutral-800/60 py-2.5 text-sm first:border-t-0">
      <div className="min-w-0">
        <span className="flex items-center gap-1.5 text-neutral-300">
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
              className="rounded border border-neutral-700 px-1 text-[10px] leading-4 text-neutral-500 hover:border-purple-500 hover:text-purple-300"
            >
              +wallet
            </button>
          )}
        </span>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-600">
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
        <span className="font-mono text-neutral-100">
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

  const knownUsdValues = [
    ...(nativeUsd !== null ? [nativeUsd] : []),
    ...topTokens.map((t) => t.usdValue).filter((v): v is number => v !== null),
  ]
  const total = knownUsdValues.length > 0 ? knownUsdValues.reduce((a, b) => a + b, 0) : null

  useEffect(() => {
    onUsdTotal?.(total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

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
          <h2 className="text-lg font-semibold text-neutral-200">
            Balances — {chainMeta.name}
          </h2>
          <DataSourceNote>
            Token balances from Blockscout · prices from CoinGecko
          </DataSourceNote>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300"
        >
          Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-100">{chainMeta.name}</h3>
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
              <span className="rounded-full bg-purple-500/20 px-2.5 py-1 text-xs text-purple-300">
                Active
              </span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => switchChain({ chainId })}
                className="rounded-lg border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50"
              >
                {isPending ? 'Switching…' : 'Switch wallet to this chain'}
              </button>
            ))}
        </div>

        <div className="mt-4 border-t border-neutral-800 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-y-1 pb-2.5 text-sm">
            <div>
              <span className="font-medium text-neutral-300">
                {chainMeta.nativeCurrency.symbol}
              </span>
              <div className="mt-0.5 text-[11px] text-neutral-600">
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
                <span className="font-mono text-neutral-100">
                  {nativeAmount !== null ? nativeAmount.toFixed(5) : '0.00000'}
                </span>
                <span className="ml-1.5 text-xs text-neutral-500">
                  {formatUsd(nativeUsd)}
                </span>
              </span>
            )}
          </div>

          {tokensLoading && (
            <div className="space-y-1.5 border-t border-neutral-800/60 py-2.5">
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
            <p className="border-t border-neutral-800/60 py-2.5 text-xs text-neutral-500">
              No ERC-20 tokens found on {chainMeta.name} for this address.
            </p>
          )}

          {!tokensLoading && !tokensError && topTokens.length > 0 && (
            <>
              <p className="pb-1 text-xs text-neutral-500">
                {topTokens.length} token{topTokens.length === 1 ? '' : 's'} with balance
                {hiddenCount > 0 && ` (showing top ${TOP_N_TOKENS} by USD value)`}
              </p>
              {topTokens.map((t) => (
                <TokenRow key={t.address} token={t} chainId={chainId} showAddToWallet={isActive} />
              ))}
              {hiddenCount > 0 && (
                <p className="border-t border-neutral-800/60 pt-1.5 text-xs text-neutral-600">
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
