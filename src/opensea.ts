// Minimal OpenSea API v2 client for "NFTs owned by this account" lookups.
// Needs an API key in the `x-api-key` header. Get one free at
// https://docs.opensea.io/reference/api-keys (instant key, no signup) or
// https://opensea.io/settings/developer for a longer-lived one, then put it
// in .env.local as VITE_OPENSEA_API_KEY.
import { fetchWithRetry, HttpError } from './net'

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2'

export interface OpenSeaNft {
  identifier: string
  collection: string
  contract: string
  name: string | null
  imageUrl: string | null
  openseaUrl: string
}

interface OpenSeaNftRaw {
  identifier: string
  collection: string
  contract: string
  name: string | null
  image_url: string | null
  display_image_url: string | null
  opensea_url: string
}

export async function fetchOpenSeaNfts(
  chain: 'base' | 'ethereum' | 'optimism' | 'arbitrum',
  address: string,
  apiKey: string,
  limit = 24,
  cursor?: string,
): Promise<{ nfts: OpenSeaNft[]; next: string | null }> {
  if (!apiKey) {
    throw new Error(
      'Missing OpenSea API key. Set VITE_OPENSEA_API_KEY in .env.local.',
    )
  }

  const query = new URLSearchParams({ limit: String(limit) })
  if (cursor) query.set('next', cursor)

  const res = await fetchWithRetry(
    `${OPENSEA_API_BASE}/chain/${chain}/account/${address}/nfts?${query.toString()}`,
    { headers: { 'x-api-key': apiKey } },
    { timeoutMs: 10_000, retries: 1 },
  )
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        'OpenSea API key rejected (invalid or expired). Get a new one at ' +
          'docs.opensea.io/reference/api-keys and update VITE_OPENSEA_API_KEY.',
      )
    }
    throw new HttpError(
      res.status,
      res.status === 429
        ? 'Rate limited by OpenSea — wait a moment and retry.'
        : `OpenSea request failed (HTTP ${res.status}).`,
    )
  }
  const data: { nfts?: OpenSeaNftRaw[]; next?: string | null } = await res.json()

  return {
    nfts: (data.nfts ?? []).map((n) => ({
      identifier: n.identifier,
      collection: n.collection,
      contract: n.contract,
      name: n.name,
      imageUrl: n.display_image_url ?? n.image_url ?? null,
      openseaUrl: n.opensea_url,
    })),
    next: data.next ?? null,
  }
}
