// NFT grid for the viewed address, scoped to whichever chain is currently
// selected (ChainTabs / selectedChain.tsx). Base/Optimism/Arbitrum use
// OpenSea API v2 (broad collection-image/metadata coverage). Ink has no
// OpenSea coverage, but Blockscout's own Ink instance DOES index NFT
// ownership directly (confirmed live against a real address before wiring
// this in) — so Ink uses that instead of a "not supported" dead end.
// Search filters by name/collection; pagination uses each source's own
// cursor so a large collection loads smoothly instead of all at once.
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { arbitrum, base, ink, optimism } from 'viem/chains'
import { fetchOpenSeaNfts } from './opensea'
import { fetchBlockscoutNfts } from './blockscoutNfts'
import { resolveImageCandidates } from './ipfs'
import { useViewingAddress } from './viewingAddress'
import { useSelectedChain, SUPPORTED_CHAINS } from './selectedChain'
import { Skeleton, ErrorState, EmptyState, useSlowLoading, DataSourceNote } from './ui'

type OpenSeaChainSlug = 'base' | 'optimism' | 'arbitrum'

// `null` means OpenSea doesn't index this chain — Ink falls through to the
// Blockscout-backed grid instead (see NftsBody below).
const OPENSEA_SLUG_BY_CHAIN: Record<number, OpenSeaChainSlug | null> = {
  [base.id]: 'base',
  [optimism.id]: 'optimism',
  [arbitrum.id]: 'arbitrum',
}

const OPENSEA_API_KEY = import.meta.env.VITE_OPENSEA_API_KEY || ''

// Common shape both data sources (OpenSea, Blockscout) get mapped into so
// NftCard/the grid don't need to know which one is in play. `imageCandidates`
// is an ORDERED list — raw IPFS references resolve to several gateway URLs
// (see ipfs.ts) since any single public gateway can rate-limit or go down
// under a full grid's worth of concurrent image loads; NftCard tries each
// in turn before giving up.
interface DisplayNft {
  contract: string
  identifier: string
  name: string | null
  collection: string
  imageCandidates: string[]
  viewUrl: string
  viewLabel: string
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError') return `Timed out — ${err.message}.`
    return err.message
  }
  return 'Unknown error.'
}

function NftCard({ nft }: { nft: DisplayNft }) {
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const currentSrc = nft.imageCandidates[candidateIndex]
  const exhausted = candidateIndex >= nft.imageCandidates.length

  return (
    <a
      href={nft.viewUrl}
      target="_blank"
      rel="noreferrer"
      title={`View on ${nft.viewLabel}`}
      className="group overflow-hidden rounded-xl border border-neutral-800 light:border-neutral-300 bg-neutral-900 light:bg-white transition hover:border-purple-500/50 hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-neutral-800 light:bg-neutral-200">
        {!exhausted ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            )}
            <img
              key={currentSrc}
              src={currentSrc}
              alt={nft.name ?? nft.collection}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(false)
                setCandidateIndex((i) => i + 1)
              }}
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
      <div className="p-3">
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
          <div className="space-y-1.5 p-3">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Shared rendering shell for both the OpenSea-backed grid and the
// Blockscout-backed grid (Ink) — they differ only in how `allNfts`/
// `nextCursor`/loading state get produced, not in how they're displayed.
function NftGridShell({
  label,
  search,
  isLoading,
  isError,
  error,
  onRetry,
  allNfts,
  nextCursor,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
  sourceNote,
}: {
  label: string
  search: string
  isLoading: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  allNfts: DisplayNft[]
  nextCursor: unknown
  isLoadingMore: boolean
  loadMoreError: string | null
  onLoadMore: () => void
  sourceNote: string
}) {
  const showSlowHint = useSlowLoading(isLoading, 1200)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allNfts
    return allNfts.filter(
      (nft) =>
        (nft.name ?? '').toLowerCase().includes(q) ||
        nft.collection.toLowerCase().includes(q),
    )
  }, [allNfts, search])

  if (!isLoading && !isError && allNfts.length === 0) {
    return (
      <>
        <DataSourceNote>{sourceNote}</DataSourceNote>
        <EmptyState message={`No NFTs found on ${label} for this address.`} />
      </>
    )
  }

  return (
    <div>
      {allNfts.length > 0 && !isLoading && (
        <p className="mb-1 text-xs text-neutral-500">
          {allNfts.length} NFT{allNfts.length === 1 ? '' : 's'} loaded
          {nextCursor ? ' — more available, use "Load more" below' : ''}
        </p>
      )}
      <DataSourceNote>{sourceNote}</DataSourceNote>

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
          onRetry={onRetry}
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
                onClick={onLoadMore}
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

function OpenSeaNftGrid({
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
  const [extraPages, setExtraPages] = useState<DisplayNft[][]>([])
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

  const firstPage: DisplayNft[] = useMemo(
    () =>
      (data?.nfts ?? []).map((n) => ({
        contract: n.contract,
        identifier: n.identifier,
        name: n.name,
        collection: n.collection,
        imageCandidates: resolveImageCandidates(n.imageUrl),
        viewUrl: n.openseaUrl,
        viewLabel: 'OpenSea',
      })),
    [data],
  )
  const allNfts = useMemo(() => [...firstPage, ...extraPages.flat()], [firstPage, extraPages])
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
      setExtraPages((prev) => [
        ...prev,
        page.nfts.map((n) => ({
          contract: n.contract,
          identifier: n.identifier,
          name: n.name,
          collection: n.collection,
          imageCandidates: resolveImageCandidates(n.imageUrl),
          viewUrl: n.openseaUrl,
          viewLabel: 'OpenSea',
        })),
      ])
      setCursor(page.next)
    } catch (err) {
      setLoadMoreError(describeError(err))
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (!OPENSEA_API_KEY) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-800 light:border-neutral-300 p-6 text-center text-sm text-neutral-500">
        Set VITE_OPENSEA_API_KEY in .env.local to load {label} NFTs. Get a
        free key at docs.opensea.io/reference/api-keys.
      </div>
    )
  }

  return (
    <NftGridShell
      label={label}
      search={search}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      allNfts={allNfts}
      nextCursor={nextCursor}
      isLoadingMore={isLoadingMore}
      loadMoreError={loadMoreError}
      onLoadMore={handleLoadMore}
      sourceNote="NFTs from OpenSea"
    />
  )
}

// Ink-specific: no OpenSea coverage, but Blockscout's Ink instance indexes
// NFT ownership directly, so this is a real, working data source rather
// than a dead end — explicitly labeled as such (not every NFT will have
// rich image/metadata quality OpenSea would normally polish, since this
// comes straight from on-chain metadata/Blockscout's own indexer).
function BlockscoutNftGrid({
  chainId,
  label,
  address,
  search,
  onCount,
}: {
  chainId: number
  label: string
  address: `0x${string}`
  search: string
  onCount?: (count: number | null) => void
}) {
  const [extraPages, setExtraPages] = useState<DisplayNft[][]>([])
  const [cursor, setCursor] = useState<Record<string, string> | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['blockscout-nfts', chainId, address],
    queryFn: () => fetchBlockscoutNfts(chainId, address),
    staleTime: 60_000,
  })

  useEffect(() => {
    setExtraPages([])
    setCursor(null)
    setLoadMoreError(null)
  }, [chainId, address])

  const firstPage: DisplayNft[] = useMemo(
    () =>
      (data?.nfts ?? []).map((n) => ({
        contract: n.contract,
        identifier: n.identifier,
        name: n.name,
        collection: n.collection,
        imageCandidates: resolveImageCandidates(n.imageUrl),
        viewUrl: n.explorerUrl,
        viewLabel: 'block explorer',
      })),
    [data],
  )
  const allNfts = useMemo(() => [...firstPage, ...extraPages.flat()], [firstPage, extraPages])
  const nextCursor = extraPages.length > 0 ? cursor : (data?.next ?? null)

  useEffect(() => {
    onCount?.(isLoading ? null : allNfts.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNfts.length, isLoading])

  async function handleLoadMore() {
    if (!nextCursor) return
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchBlockscoutNfts(chainId, address, nextCursor)
      setExtraPages((prev) => [
        ...prev,
        page.nfts.map((n) => ({
          contract: n.contract,
          identifier: n.identifier,
          name: n.name,
          collection: n.collection,
          imageCandidates: resolveImageCandidates(n.imageUrl),
          viewUrl: n.explorerUrl,
          viewLabel: 'block explorer',
        })),
      ])
      setCursor(page.next)
    } catch (err) {
      setLoadMoreError(describeError(err))
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <NftGridShell
      label={label}
      search={search}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={() => refetch()}
      allNfts={allNfts}
      nextCursor={nextCursor}
      isLoadingMore={isLoadingMore}
      loadMoreError={loadMoreError}
      onLoadMore={handleLoadMore}
      sourceNote="NFTs from Blockscout (Ink has no OpenSea coverage yet — image/metadata quality may vary more than on other chains)"
    />
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
  const isInk = chainId === ink.id

  if (!address) return null

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight text-neutral-200 light:text-neutral-800">
          NFTs — {chainMeta.name}
        </h2>
        {(openSeaSlug || isInk) && (
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
        <OpenSeaNftGrid
          chainSlug={openSeaSlug}
          label={chainMeta.name}
          address={address}
          search={search}
          onCount={onCount}
        />
      ) : isInk ? (
        <BlockscoutNftGrid
          chainId={chainId}
          label={chainMeta.name}
          address={address}
          search={search}
          onCount={onCount}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-neutral-800 light:border-neutral-300 p-6 text-center text-sm text-neutral-500">
          NFT lookup isn't available for {chainMeta.name} yet.
        </div>
      )}
    </section>
  )
}
