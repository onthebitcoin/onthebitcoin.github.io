// Multi-chain balance section: native + known token balances per chain,
// with an easy "Switch to this chain" action, plus an estimated USD value
// per chain and a portfolio-wide total (CoinGecko prices, best-effort).
// Note: wagmi v3's useBalance only returns native balance ({decimals, symbol,
// value} as bigint, no ERC20 `token` option and no `.formatted`). ERC20 token
// balances are read directly via useReadContract + viem's erc20Abi, formatted
// with formatUnits.
import { useEffect, useState } from 'react'
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi'
import { arbitrum, base, ink, optimism } from 'viem/chains'
import { erc20Abi, formatUnits } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_BY_CHAIN } from './tokens'
import { fetchTokenPrices, formatUsd, priceForSymbol, type TokenPrices } from './prices'
import { useViewingAddress } from './viewingAddress'
import { Skeleton } from './ui'

const SUPPORTED_CHAINS = [base, ink, optimism, arbitrum]

function TokenRow({
  address,
  chainId,
  symbol,
  tokenAddress,
  decimals,
  prices,
  onUsdValue,
}: {
  address: `0x${string}`
  chainId: number
  symbol: string
  tokenAddress: `0x${string}`
  decimals: number
  prices?: TokenPrices
  onUsdValue: (usd: number | null) => void
}) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId,
  })

  const amount = data !== undefined ? Number(formatUnits(data, decimals)) : null
  const price = prices ? priceForSymbol(symbol, prices) : null
  const usdValue = amount !== null && price !== null ? amount * price : null

  useEffect(() => {
    onUsdValue(usdValue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usdValue])

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-neutral-400">{symbol}</span>
      {isLoading ? (
        <Skeleton className="h-4 w-16" />
      ) : isError ? (
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs text-red-400 hover:underline"
        >
          error — retry
        </button>
      ) : (
        <span className="text-right">
          <span className="font-mono text-neutral-100">
            {amount !== null ? amount.toFixed(4) : '0.0000'}
          </span>
          <span className="ml-1.5 text-xs text-neutral-500">
            {formatUsd(usdValue)}
          </span>
        </span>
      )}
    </div>
  )
}

function ChainBalanceCard({
  chainId,
  address,
  isConnectedWallet,
  prices,
  onUsdTotal,
}: {
  chainId: number
  address: `0x${string}`
  isConnectedWallet: boolean
  prices?: TokenPrices
  onUsdTotal: (chainId: number, usd: number | null) => void
}) {
  const { chain: activeChain } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!
  const tokens = TOKENS_BY_CHAIN[chainId] ?? []

  // usdParts holds the native row's value plus one entry per token, keyed by
  // symbol so each row can report independently without clobbering others.
  const [usdParts, setUsdParts] = useState<Record<string, number | null>>({})

  const setPart = (key: string, value: number | null) =>
    setUsdParts((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))

  const total = Object.values(usdParts).some((v) => v !== null)
    ? Object.values(usdParts).reduce((sum: number, v) => sum + (v ?? 0), 0)
    : null

  useEffect(() => {
    onUsdTotal(chainId, total)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const {
    data: native,
    isLoading,
    isError,
    refetch,
  } = useBalance({
    address,
    chainId,
  })

  const nativeAmount = native ? Number(formatUnits(native.value, native.decimals)) : null
  const nativePrice = prices?.ethUsd ?? null
  const nativeUsd = nativeAmount !== null && nativePrice !== null ? nativeAmount * nativePrice : null

  useEffect(() => {
    setPart('native', nativeUsd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeUsd])

  // "Active"/"Switch" only make sense for the real connected wallet — a
  // watch-only address isn't "on" any chain, it's just an address we read
  // balances for, so we hide chain-switching chrome for it entirely.
  const isActive = isConnectedWallet && activeChain?.id === chainId

  return (
    <div
      className={`rounded-xl border p-4 transition ${
        isActive
          ? 'border-purple-500/50 bg-purple-500/5'
          : 'border-neutral-800 bg-neutral-900'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-neutral-100">{chainMeta.name}</h3>
          <p className="text-xs text-neutral-500">
            {formatUsd(total)} est. value
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
              {isPending ? 'Switching…' : 'Switch'}
            </button>
          ))}
      </div>

      <div className="mt-3 border-t border-neutral-800 pt-3">
        <div className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-neutral-400">
            {chainMeta.nativeCurrency.symbol} (native)
          </span>
          {isLoading ? (
            <Skeleton className="h-4 w-20" />
          ) : isError ? (
            <button
              type="button"
              onClick={() => refetch()}
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

        {tokens.map((t) => (
          <TokenRow
            key={t.address}
            address={address}
            chainId={chainId}
            symbol={t.symbol}
            tokenAddress={t.address}
            decimals={t.decimals}
            prices={prices}
            onUsdValue={(usd) => setPart(t.symbol, usd)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Balances() {
  const { address, isConnectedWallet } = useViewingAddress()
  const [totalsByChain, setTotalsByChain] = useState<Record<number, number | null>>({})

  const { data: prices, isError: pricesError } = useQuery({
    queryKey: ['token-prices'],
    queryFn: fetchTokenPrices,
    staleTime: 60_000,
    retry: 1,
  })

  if (!address) return null

  const knownTotals = Object.values(totalsByChain).filter(
    (v): v is number => v !== null && v !== undefined,
  )
  const grandTotal = knownTotals.length > 0 ? knownTotals.reduce((a, b) => a + b, 0) : null

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">Balances</h2>
        <p className="text-sm text-neutral-400">
          Portfolio total:{' '}
          <span className="font-mono text-neutral-100">
            {formatUsd(grandTotal)}
          </span>
          {pricesError && (
            <span className="ml-2 text-xs text-neutral-500">
              (prices unavailable)
            </span>
          )}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORTED_CHAINS.map((c) => (
          <ChainBalanceCard
            key={c.id}
            chainId={c.id}
            address={address}
            isConnectedWallet={isConnectedWallet}
            prices={prices}
            onUsdTotal={(chainId, usd) =>
              setTotalsByChain((prev) =>
                prev[chainId] === usd ? prev : { ...prev, [chainId]: usd },
              )
            }
          />
        ))}
      </div>
    </section>
  )
}
