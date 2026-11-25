// Single-chain balance section: native + known token balances for whichever
// chain is currently selected (ChainTabs / selectedChain.tsx), with an easy
// "Switch to this chain" action, an estimated USD value, and a CSV export.
// Note: wagmi v3's useBalance only returns native balance ({decimals, symbol,
// value} as bigint, no ERC20 `token` option and no `.formatted`). ERC20 token
// balances are read directly via useReadContract + viem's erc20Abi, formatted
// with formatUnits.
import { useEffect, useState } from 'react'
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi'
import { erc20Abi, formatUnits } from 'viem'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_BY_CHAIN } from './tokens'
import { fetchTokenPrices, formatUsd, priceForSymbol, type TokenPrices } from './prices'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { downloadCsv } from './csv'
import { Skeleton, useSlowLoading } from './ui'

interface BalanceRow {
  symbol: string
  amount: number | null
  usdValue: number | null
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

function TokenRow({
  address,
  chainId,
  symbol,
  tokenAddress,
  decimals,
  prices,
  showAddToWallet,
  onRow,
}: {
  address: `0x${string}`
  chainId: number
  symbol: string
  tokenAddress: `0x${string}`
  decimals: number
  prices?: TokenPrices
  showAddToWallet: boolean
  onRow: (row: BalanceRow) => void
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
    onRow({ symbol, amount, usdValue })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, usdValue])

  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-1.5 text-neutral-400">
        {symbol}
        {showAddToWallet && (
          <button
            type="button"
            title={`Add ${symbol} to wallet`}
            onClick={() => addTokenToWallet({ address: tokenAddress, symbol, decimals })}
            className="rounded border border-neutral-700 px-1 text-[10px] leading-4 text-neutral-500 hover:border-purple-500 hover:text-purple-300"
          >
            +wallet
          </button>
        )}
      </span>
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
  const tokens = TOKENS_BY_CHAIN[chainId] ?? []

  const { data: prices, isLoading: pricesLoading, isError: pricesError, refetch: refetchPrices } = useQuery({
    queryKey: ['token-prices'],
    queryFn: fetchTokenPrices,
    staleTime: 60_000,
    retry: 1,
  })

  // rowsByKey holds the native row plus one entry per token, keyed by symbol
  // so each row can report independently without clobbering others.
  const [rowsByKey, setRowsByKey] = useState<Record<string, BalanceRow>>({})

  // Reset immediately when switching chain or address — otherwise the old
  // chain's rows (and USD total) would flash briefly before the new ones load.
  useEffect(() => {
    setRowsByKey({})
  }, [chainId, address])

  const setRow = (key: string, row: BalanceRow) =>
    setRowsByKey((prev) =>
      prev[key]?.amount === row.amount && prev[key]?.usdValue === row.usdValue
        ? prev
        : { ...prev, [key]: row },
    )

  const rows = Object.values(rowsByKey)
  const total = rows.some((r) => r.usdValue !== null)
    ? rows.reduce((sum: number, r) => sum + (r.usdValue ?? 0), 0)
    : null

  useEffect(() => {
    onUsdTotal?.(total)
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

  const showSlowHint = useSlowLoading(isLoading, 1500)

  const nativeAmount = native ? Number(formatUnits(native.value, native.decimals)) : null
  const nativePrice = prices?.ethUsd ?? null
  const nativeUsd = nativeAmount !== null && nativePrice !== null ? nativeAmount * nativePrice : null

  useEffect(() => {
    setRow('native', {
      symbol: `${chainMeta.nativeCurrency.symbol} (native)`,
      amount: nativeAmount,
      usdValue: nativeUsd,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeAmount, nativeUsd, chainId])

  // "Active"/"Switch" only make sense for the real connected wallet — a
  // watch-only address isn't "on" any chain, it's just an address we read
  // balances for, so we hide chain-switching chrome for it entirely.
  const isActive = isConnectedWallet && activeChain?.id === chainId

  function handleExport() {
    if (!address || rows.length === 0) return
    downloadCsv(
      `onthebitcoin-balances-${chainMeta.name.toLowerCase().replace(/\s+/g, '-')}.csv`,
      rows.map((r) => ({
        chain: chainMeta.name,
        symbol: r.symbol,
        amount: r.amount ?? '',
        usdValue: r.usdValue !== null ? r.usdValue.toFixed(2) : '',
      })),
    )
  }

  if (!address) return null

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">
          Balances — {chainMeta.name}
        </h2>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300"
        >
          Export CSV
        </button>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-100">{chainMeta.name}</h3>
            <p className="text-xs text-neutral-500">
              {formatUsd(total)} est. value
              {pricesLoading && ' · loading prices…'}
              {pricesError && (
                <>
                  {' '}
                  · prices unavailable —{' '}
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
              showAddToWallet={isActive}
              onRow={(row) => setRow(t.symbol, row)}
            />
          ))}
        </div>

        {isLoading && showSlowHint && (
          <p className="mt-2 text-xs text-neutral-500">
            Loading {chainMeta.name} balance…
          </p>
        )}
      </div>
    </section>
  )
}
