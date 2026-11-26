// NFT grid for the viewed address (OpenSea API v2), scoped to whichever
// chain is currently selected (ChainTabs / selectedChain.tsx). Ink has no
// reliable OpenSea coverage yet, so that chain shows a clear "not supported"
// message instead of a broken fetch. Search filters by name/collection;
// pagination uses OpenSea's own cursor so a large collection loads smoothly
// instead of all at once.
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { arbitrum, base, optimism } from 'viem/chains'
import { fetchOpenSeaNfts, type OpenSeaNft } from './opensea'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { Skeleton, ErrorState, EmptyState, useSlowLoading, DataSourceNote } from './ui'

type OpenSeaChainSlug = 'base' | 'optimism' | 'arbitrum'

// Maps our 4 EVM chain ids to OpenSea's chain slug. `null` means OpenSea
// doesn't reliably index this chain yet (Ink) — handled as an explicit
// "not supported" state rather than silently failing.
const OPENSEA_SLUG_BY_CHAIN: Record<number, OpenSeaChainSlug | null> = {
  [base.id]: 'base',
  [optimism.id]: 'optimism',
  [arbitrum.id]: 'arbitrum',
}

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
      className="group overflow-hidden rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white transition hover:border-purple-500/50"
    >
      <div className="relative aspect-square w-full bg-neutral-800 light:bg-neutral-200">
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
        <p className="truncate text-sm font-medium text-neutral-100 light:text-neutral-900">
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
        <div key={i} className="overflow-hidden rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white">
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
  chainSlug,
  label,
  address,
  search,
  onCount,
}: {
  chainSlug: OpenSeaChainSlug
  label: string
  address: `0x${string}`
  search: string
  onCount?: (count: number | null) => void
}) {
  const [extraPages, setExtraPages] = useState<OpenSeaNft[][]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['opensea-nfts', chainSlug, address],
    queryFn: () => fetchOpenSeaNfts(chainSlug, address, OPENSEA_API_KEY),
    enabled: Boolean(OPENSEA_API_KEY),
    staleTime: 60_000,
  })

  useEffect(() => {
    setExtraPages([])
    setCursor(null)
    setLoadMoreError(null)
  }, [chainSlug, address])

  const showSlowHint = useSlowLoading(isLoading, 1200)

  const allNfts = useMemo(
    () => [...(data?.nfts ?? []), ...extraPages.flat()],
    [data, extraPages],
  )
  const nextCursor = extraPages.length > 0 ? cursor : (data?.next ?? null)

  useEffect(() => {
    onCount?.(isLoading ? null : (OPENSEA_API_KEY ? allNfts.length : null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNfts.length, isLoading])

  async function handleLoadMore() {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchOpenSeaNfts(chainSlug, address, OPENSEA_API_KEY, 24, nextCursor)
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
      <div className="rounded-xl border border-dashed border-neutral-800 light:border-neutral-300 p-6 text-center text-sm text-neutral-500">
        Set VITE_OPENSEA_API_KEY in .env.local to load {label} NFTs. Get a
        free key at docs.opensea.io/reference/api-keys.
      </div>
    )
  }

  if (!isLoading && !isError && allNfts.length === 0) {
    return <EmptyState message={`No NFTs found on ${label} for this address.`} />
  }

  return (
    <div>
      {allNfts.length > 0 && !isLoading && (
        <p className="mb-1 text-xs text-neutral-500">
          {allNfts.length} NFT{allNfts.length === 1 ? '' : 's'} loaded
          {nextCursor ? ' — more available, use "Load more" below' : ''}
        </p>
      )}
      <DataSourceNote>NFTs from OpenSea</DataSourceNote>

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
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                className="rounded-lg border border-neutral-700 light:border-neutral-300 px-3 py-1.5 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300 disabled:opacity-50"
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

export default function Nfts({
  onCount,
}: {
  onCount?: (count: number | null) => void
}) {
  const { address } = useViewingAddress()
  const { chainId } = useSelectedChain()
  const [search, setSearch] = useState('')
  const chainMeta = SUPPORTED_CHAINS.find((c) => c.id === chainId)!
  const openSeaSlug = OPENSEA_SLUG_BY_CHAIN[chainId] ?? null

  // Ink (and any future chain without OpenSea coverage) reports a definite
  // "0" rather than "unknown" — there's deliberately no overlapping reset
  // here for supported chains, since ChainNftGrid already reports null
  // while loading and the real count once resolved; firing both would race.
  useEffect(() => {
    if (!openSeaSlug) onCount?.(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSeaSlug, chainId, address])

  if (!address) return null

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-200 light:text-neutral-800">
          NFTs — {chainMeta.name}
        </h2>
        {openSeaSlug && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or collection…"
            className="w-full max-w-xs rounded-lg border border-neutral-700 light:border-neutral-300 bg-neutral-900 light:bg-white px-3 py-1.5 text-sm text-neutral-100 light:text-neutral-900 placeholder:text-neutral-600 light:text-neutral-500 focus:border-purple-500 focus:outline-none"
          />
        )}
      </div>

      {openSeaSlug ? (
        <ChainNftGrid
          chainSlug={openSeaSlug}
          label={chainMeta.name}
          address={address}
          search={search}
          onCount={onCount}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-800 light:border-neutral-300 p-6 text-center text-sm text-neutral-500">
          NFT lookup isn't available for {chainMeta.name} yet — no reliable
          public indexer for this chain. Switch to Base, Optimism, or
          Arbitrum to see NFTs.
        </div>
      )}
    </section>
  )
}
