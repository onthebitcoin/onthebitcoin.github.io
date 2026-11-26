// Resolves an NFT image reference (which may be a plain https URL, an
// `ipfs://<cid>/<path>` URI, or an already-gatewayed `.../ipfs/<cid>/...`
// URL pointing at a specific gateway) into an ORDERED list of candidate
// https URLs to try. The UI (NftCard) tries them in order and only shows
// "No image" after every candidate has failed.
//
// Why this exists: Blockscout's Ink NFT endpoint mostly points at
// dweb.link, and testing showed dweb.link returns HTTP 429 (rate limited)
// under the burst of ~20-50 concurrent image requests a full NFT grid
// makes — a real, confirmed gateway-reliability problem, not a bug in
// how we request it. ipfs.io was also found unreachable in testing.
// ipfs.filebase.io and gateway.pinata.cloud were confirmed reachable and
// did NOT rate-limit the same burst, so those are tried first.
const IPFS_GATEWAYS = [
  'https://ipfs.filebase.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
]

// Pulls the `<cid>/<optional path>` suffix out of any of the shapes we
// might see: `ipfs://cid/path`, `https://<gateway>/ipfs/cid/path`.
// Returns null if the input isn't an IPFS reference at all (a normal
// https CDN URL, which doesn't need any fallback gateway).
function extractIpfsPath(url: string): string | null {
  if (url.startsWith('ipfs://')) {
    return url.slice('ipfs://'.length).replace(/^ipfs\//, '')
  }
  const marker = '/ipfs/'
  const idx = url.indexOf(marker)
  if (idx !== -1) return url.slice(idx + marker.length)
  return null
}

export function resolveImageCandidates(url: string | null): string[] {
  if (!url) return []
  const ipfsPath = extractIpfsPath(url)
  if (ipfsPath === null) return [url]
  return IPFS_GATEWAYS.map((gateway) => gateway + ipfsPath)
}
