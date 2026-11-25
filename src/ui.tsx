// Tiny shared UI bits (skeleton loader, retry button, slow-loading hint)
// used across the Balances / Activity / NFTs / Prices sections. Deliberately
// minimal — no UI library.
import { useEffect, useState } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded bg-neutral-800 ${className}`}
    />
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-sm">
      <p className="text-red-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-purple-500 hover:text-purple-300"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-sm text-neutral-500">{message}</p>
}

/**
 * Returns true only once `active` has been true continuously for `delayMs`.
 * Used to show a friendlier "Loading X on Base…" text under a skeleton once
 * a fetch has clearly become slow, without flashing that text on every
 * normal, fast load (which would just be noise).
 */
export function useSlowLoading(active: boolean, delayMs = 1200): boolean {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!active) {
      setSlow(false)
      return
    }
    const timer = setTimeout(() => setSlow(true), delayMs)
    return () => clearTimeout(timer)
  }, [active, delayMs])

  return slow
}
