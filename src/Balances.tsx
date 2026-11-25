// Multi-chain balance section: native + known token balances per chain,
// with an easy "Switch to this chain" action, plus an estimated USD value
// per chain, a portfolio-wide total (CoinGecko prices, best-effort), and a
// CSV export of every row currently shown.
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
import { downloadCsv } from './csv'
import { Skeleton } from './ui'

const SUPPORTED_CHAINS = [base, ink, optimism, arbitrum]

interface BalanceRow {
  chain: string
  symbol: string
  amount: number | null
  usdValue: number | null
}

function TokenRow({
  address,
  chainId,
  symbol,
  tokenAddress,
  decimals,
  prices,
  onRow,
}: {
  address: `0x${string}`
  chainId: number
  symbol: string
  tokenAddress: `0x${string}`
  decimals: number
  prices?: TokenPrices
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
    onRow({ chain: '', symbol, amount, usdValue })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, usdValue])

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
  onRows,
}: {
  chainId: number
  address: `0x${string}`
  isConnectedWallet: boolean
  prices?: TokenPrices
  onUsdTotal: (chainId: number, usd: number | null) => void
  onRows: (chainId: number, rows: BalanceRow[]) => void
}) {
  const { chain: activeChain } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!
  const tokens = TOKENS_BY_CHAIN[chainId] ?? []

  // rowsByKey holds the native row plus one entry per token, keyed by symbol
  // so each row can report independently without clobbering others.
  const [rowsByKey, setRowsByKey] = useState<Record<string, BalanceRow>>({})

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
    onUsdTotal(chainId, total)
    onRows(chainId, rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r) => `${r.symbol}:${r.amount}:${r.usdValue}`).join('|')])

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
    setRow('native', {
      chain: chainMeta.name,
      symbol: `${chainMeta.nativeCurrency.symbol} (native)`,
      amount: nativeAmount,
      usdValue: nativeUsd,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeAmount, nativeUsd])

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
            onRow={(row) => setRow(t.symbol, { ...row, chain: chainMeta.name })}
          />
        ))}
      </div>
    </div>
  )
}

export default function Balances() {
  const { address, isConnectedWallet } = useViewingAddress()
  const [totalsByChain, setTotalsByChain] = useState<Record<number, number | null>>({})
  const [rowsByChain, setRowsByChain] = useState<Record<number, BalanceRow[]>>({})

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

  function handleExport() {
    const allRows = Object.values(rowsByChain).flat()
    if (allRows.length === 0) return
    downloadCsv(
      'onthebitcoin-balances.csv',
      allRows.map((r) => ({
        chain: r.chain,
        symbol: r.symbol,
        amount: r.amount ?? '',
        usdValue: r.usdValue !== null ? r.usdValue.toFixed(2) : '',
      })),
    )
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">Balances</h2>
        <p className="flex items-center gap-3 text-sm text-neutral-400">
          <span>
            Portfolio total:{' '}
            <span className="font-mono text-neutral-100">
              {formatUsd(grandTotal)}
            </span>
            {pricesError && (
              <span className="ml-2 text-xs text-neutral-500">
                (prices unavailable)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300"
          >
            Export CSV
          </button>
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
            onRows={(chainId, rows) =>
              setRowsByChain((prev) => ({ ...prev, [chainId]: rows }))
            }
          />
        ))}
      </div>
    </section>
  )
}
