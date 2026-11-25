// Shared network helpers: every external call (Blockscout, OpenSea,
// CoinGecko) goes through here so timeouts/retries and error messages are
// consistent, instead of each client reinventing fetch error handling.

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Request timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

/** fetch() with a hard timeout — never let a slow/stuck API hang the UI. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TimeoutError(timeoutMs)
    }
    // A fetch() that rejects without an HTTP response at all is a network
    // problem (offline, DNS, CORS, blocked) — surface that plainly rather
    // than leaking a cryptic "Failed to fetch".
    throw new Error('Network error — check your connection and try again.')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * fetchWithTimeout + one quiet retry on timeout/network errors only (never
 * retries a real HTTP error like 404/401, since repeating those just wastes
 * time for the same result).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10_000, retries = 1 } = opts
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchWithTimeout(url, init, timeoutMs)
    } catch (err) {
      lastErr = err
      const retryable = err instanceof TimeoutError || (err instanceof Error && err.message.includes('Network error'))
      if (!retryable || attempt === retries) throw err
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
    }
  }
  throw lastErr
}
