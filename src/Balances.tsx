// Multi-chain balance section: native + known token balances per chain,
// with an easy "Switch to this chain" action.
// Note: wagmi v3's useBalance only returns native balance ({decimals, symbol,
// value} as bigint, no ERC20 `token` option and no `.formatted`). ERC20 token
// balances are read directly via useReadContract + viem's erc20Abi, formatted
// with formatUnits.
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi'
import { arbitrum, base, ink, optimism } from 'viem/chains'
import { erc20Abi, formatUnits } from 'viem'
import { TOKENS_BY_CHAIN } from './tokens'
import { Skeleton } from './ui'

const SUPPORTED_CHAINS = [base, ink, optimism, arbitrum]

function TokenRow({
  address,
  chainId,
  symbol,
  tokenAddress,
  decimals,
}: {
  address: `0x${string}`
  chainId: number
  symbol: string
  tokenAddress: `0x${string}`
  decimals: number
}) {
  const { data, isLoading, isError, refetch } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
    chainId,
  })

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
        <span className="font-mono text-neutral-100">
          {data !== undefined ? Number(formatUnits(data, decimals)).toFixed(4) : '0.0000'}
        </span>
      )}
    </div>
  )
}

function ChainBalanceCard({ chainId }: { chainId: number }) {
  const { address, chain: activeChain } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!
  const tokens = TOKENS_BY_CHAIN[chainId] ?? []

  const {
    data: native,
    isLoading,
    isError,
    refetch,
  } = useBalance({
    address,
    chainId,
  })

  const isActive = activeChain?.id === chainId

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
          <p className="text-xs text-neutral-500">chain id {chainId}</p>
        </div>
        {isActive ? (
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
        )}
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
            <span className="font-mono text-neutral-100">
              {native ? Number(formatUnits(native.value, native.decimals)).toFixed(5) : '0.00000'}
            </span>
          )}
        </div>

        {address &&
          tokens.map((t) => (
            <TokenRow
              key={t.address}
              address={address}
              chainId={chainId}
              symbol={t.symbol}
              tokenAddress={t.address}
              decimals={t.decimals}
            />
          ))}
      </div>
    </div>
  )
}

export default function Balances() {
  const { isConnected } = useAccount()

  if (!isConnected) return null

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-200">
        Balances
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORTED_CHAINS.map((c) => (
          <ChainBalanceCard key={c.id} chainId={c.id} />
        ))}
      </div>
    </section>
  )
}
