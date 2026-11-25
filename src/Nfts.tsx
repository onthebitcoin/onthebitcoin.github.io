// NFT grid for the viewed address (OpenSea API v2). Base + Ethereum +
// Optimism + Arbitrum. A single search box filters by name/collection
// across all four chains at once; each chain paginates independently via
// OpenSea's cursor so a large collection loads smoothly instead of all at
// once.
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchOpenSeaNfts, type OpenSeaNft } from './opensea'
import { useViewingAddress } from './viewingAddress'
import { Skeleton, ErrorState, EmptyState, useSlowLoading } from './ui'

const CHAINS: { id: 'base' | 'ethereum' | 'optimism' | 'arbitrum'; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'optimism', label: 'Optimism' },
  { id: 'arbitrum', label: 'Arbitrum' },
]

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY || ''

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError') return `Timed out — ${err.message}.`
    return err.message
  }
  return 'Unknown error.'
}

function NftCard({ nft }: { nft: OpenSeaNft }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const showImage = nft.imageUrl && !imageFailed

  return (
    <a
      href={nft.openseaUrl}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 transition hover:border-purple-500/50"
    >
      <div className="relative aspect-square w-full bg-neutral-800">
        {showImage ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            )}
            <img
              src={nft.imageUrl!}
              alt={nft.name ?? nft.collection}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageFailed(true)}
              className={`h-full w-full object-cover transition group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </>
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

function ChainNftGrid({
  chainId,
  label,
  address,
  search,
}: {
  chainId: 'base' | 'ethereum' | 'optimism' | 'arbitrum'
  label: string
  address: `0x${string}`
  search: string
}) {
  const [extraPages, setExtraPages] = useState<OpenSeaNft[][]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['opensea-nfts', chainId, address],
    queryFn: () => fetchOpenSeaNfts(chainId, address, OPENSEA_API_KEY),
    enabled: Boolean(OPENSEA_API_KEY),
    staleTime: 60_000,
  })

  useEffect(() => {
    setExtraPages([])
    setCursor(null)
    setLoadMoreError(null)
  }, [chainId, address])

  const showSlowHint = useSlowLoading(isLoading, 1200)

  const allNfts = useMemo(
    () => [...(data?.nfts ?? []), ...extraPages.flat()],
    [data, extraPages],
  )
  const nextCursor = extraPages.length > 0 ? cursor : (data?.next ?? null)

  async function handleLoadMore() {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchOpenSeaNfts(chainId, address, OPENSEA_API_KEY, 24, nextCursor)
      setExtraPages((prev) => [...prev, page.nfts])
      setCursor(page.next)
    } catch (err) {
      setLoadMoreError(describeError(err))
    } finally {
      setIsLoadingMore(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allNfts
    return allNfts.filter(
      (nft) =>
        (nft.name ?? '').toLowerCase().includes(q) ||
        nft.collection.toLowerCase().includes(q),
    )
  }, [allNfts, search])

  if (!OPENSEA_API_KEY) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 p-6 text-center text-sm text-neutral-500">
        Set VITE_OPENSEA_API_KEY in .env.local to load {label} NFTs. Get a
        free key at docs.opensea.io/reference/api-keys.
      </div>
    )
  }

  // Once loaded, a chain with zero NFTs to begin with is just noise once
  // you're searching across all chains — skip rendering its empty header
  // entirely rather than showing "No NFTs found" four times over.
  if (!isLoading && !isError && allNfts.length === 0) {
    return (
      <div>
        <h3 className="mb-3 font-semibold text-neutral-100">{label} NFTs</h3>
        <EmptyState message={`No NFTs found on ${label} for this address.`} />
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3 font-semibold text-neutral-100">{label} NFTs</h3>

      {isLoading && (
        <>
          <NftGridSkeleton />
          {showSlowHint && (
            <p className="mt-2 text-xs text-neutral-500">
              Fetching NFT metadata for {label}…
            </p>
          )}
        </>
      )}

      {isError && (
        <ErrorState
          message={`Could not load ${label} NFTs: ${describeError(error)}`}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && filtered.length === 0 && allNfts.length > 0 && (
        <EmptyState message={`No ${label} NFTs match "${search}".`} />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((nft) => (
              <NftCard key={`${nft.contract}-${nft.identifier}`} nft={nft} />
            ))}
          </div>

          {nextCursor && !search.trim() && (
            <div className="mt-3 flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading more…' : 'Load more NFTs'}
              </button>
              {loadMoreError && (
                <p className="text-xs text-red-400">{loadMoreError}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Nfts() {
  const { address } = useViewingAddress()
  const [search, setSearch] = useState('')
  if (!address) return null

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200">NFTs</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or collection…"
          className="w-full max-w-xs rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-purple-500 focus:outline-none"
        />
      </div>
      <div className="space-y-6">
        {CHAINS.map((c) => (
          <ChainNftGrid
            key={c.id}
            chainId={c.id}
            label={c.label}
            address={address}
            search={search}
          />
        ))}
      </div>
    </section>
  )
}
