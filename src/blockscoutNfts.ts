// NFT ownership via Blockscout's own `/addresses/{address}/nft` endpoint —
// used specifically for Ink, which OpenSea does not index. Confirmed live
// (see commit notes) that Blockscout's Ink instance actually returns real,
// well-formed NFT data (images, metadata, collection names) for this
// endpoint, so "no NFT support on Ink" was genuinely just "no OpenSea
// coverage", not "no data exists anywhere" — this fills that gap with the
// same API family already used for balances/activity on every chain (no
// extra API key, no CORS issues).
import { BLOCKSCOUT_CHAINS } from './blockscout'
import { fetchWithRetry, HttpError } from './net'

export interface BlockscoutNft {
  contract: string
  identifier: string
  name: string | null
  collection: string
  imageUrl: string | null
  explorerUrl: string
}

export interface BlockscoutNftPage {
  nfts: BlockscoutNft[]
  next: Record<string, string> | null
}

interface RawNftItem {
  id: string
  image_url: string | null
  token: {
    address_hash: string
    name: string | null
    symbol: string | null
    type: string
  }
  metadata: {
    name?: string | null
    image?: string | null
    image_data?: string | null
  } | null
}

interface RawNftResponse {
  items: RawNftItem[]
  next_page_params: Record<string, string> | null
}

// `metadata.image_data` is sometimes raw inline SVG markup (no `image_url`
// at all) — e.g. NFTs2Me's auto-generated "collection ownership" tokens.
// Turn that into a data: URL so it still renders as an <img>.
function resolveImage(item: RawNftItem): string | null {
  if (item.image_url) return item.image_url
  if (item.metadata?.image) return item.metadata.image
  if (item.metadata?.image_data) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(item.metadata.image_data)}`
  }
  return null
}

export async function fetchBlockscoutNfts(
  chainId: number,
  address: string,
  pageParams?: Record<string, string> | null,
): Promise<BlockscoutNftPage> {
  const chainMeta = BLOCKSCOUT_CHAINS[chainId]
  if (!chainMeta) throw new Error(`No Blockscout endpoint configured for chain ${chainId}`)

  const query = new URLSearchParams({ type: 'ERC-721,ERC-404,ERC-1155' })
  if (pageParams) {
    for (const [k, v] of Object.entries(pageParams)) query.set(k, v)
  }
  const url = `${chainMeta.apiBase}/addresses/${address}/nft?${query.toString()}`

  const res = await fetchWithRetry(url, {}, { timeoutMs: 12_000, retries: 1 })
  if (!res.ok) {
    if (res.status === 404) return { nfts: [], next: null }
    throw new HttpError(
      res.status,
      res.status === 429
        ? 'Rate limited by the block explorer — wait a moment and retry.'
        : `Block explorer request failed (HTTP ${res.status}).`,
    )
  }

  const data: RawNftResponse = await res.json()
  const nfts = (data.items ?? []).map((item): BlockscoutNft => ({
    contract: item.token.address_hash,
    identifier: item.id,
    name: item.metadata?.name ?? null,
    collection: item.token.name ?? item.token.symbol ?? 'Unknown collection',
    imageUrl: resolveImage(item),
    explorerUrl: `${chainMeta.explorerBase}/token/${item.token.address_hash}/instance/${item.id}`,
  }))

  return { nfts, next: data.next_page_params ?? null }
}
