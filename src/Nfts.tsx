// NFT grid for the connected address (OpenSea API v2). Base + Ethereum for
// now, per the brief ("chain Ethereum hoặc Base là đủ giai đoạn đầu").
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { fetchOpenSeaNfts } from './opensea'
import { Skeleton, ErrorState, EmptyState } from './ui'

const CHAINS: { id: 'base' | 'ethereum' | 'optimism' | 'arbitrum'; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'optimism', label: 'Optimism' },
  { id: 'arbitrum', label: 'Arbitrum' },
]

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY || ''

function NftCard({
  nft,
}: {
  nft: { name: string | null; imageUrl: string | null; collection: string; openseaUrl: string }
}) {
  return (
    <a
      href={nft.openseaUrl}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-purple-500/50"
    >
      <div className="aspect-square w-full bg-neutral-800">
        {nft.imageUrl ? (
          <img
            src={nft.imageUrl}
            alt={nft.name ?? nft.collection}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
            No image
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-neutral-100">
          {nft.name ?? 'Untitled'}
        </p>
        <p className="truncate text-xs text-neutral-500">{nft.collection}</p>
      </div>
    </a>
  )
}

function NftGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-1.5 p-2.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChainNftGrid({ chainId, label }: { chainId: 'base' | 'ethereum' | 'optimism' | 'arbitrum'; label: string }) {
  const { address } = useAccount()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['opensea-nfts', chainId, address],
    queryFn: () => fetchOpenSeaNfts(chainId, address!, OPENSEA_API_KEY),
    enabled: Boolean(address) && Boolean(OPENSEA_API_KEY),
    staleTime: 60_000,
  })

  if (!OPENSEA_API_KEY) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
        Set VITE_OPENSEA_API_KEY in .env.local to load {label} NFTs. Get a
        free key at docs.opensea.io/reference/api-keys.
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 font-semibold text-neutral-100">{label} NFTs</h3>

      {isLoading && <NftGridSkeleton />}

      {isError && (
        <ErrorState
          message={`Could not load NFTs: ${(error as Error)?.message ?? 'unknown error'}`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <EmptyState message={`No NFTs found on ${label} for this address.`} />
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data!.map((nft) => (
            <NftCard key={`${nft.contract}-${nft.identifier}`} nft={nft} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Nfts() {
  const { isConnected } = useAccount()
  if (!isConnected) return null

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-200">NFTs</h2>
      <div className="space-y-6">
        {CHAINS.map((c) => (
          <ChainNftGrid key={c.id} chainId={c.id} label={c.label} />
        ))}
      </div>
    </section>
  )
}
