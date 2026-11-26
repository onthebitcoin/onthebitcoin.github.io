// Tiny shared UI bits (skeleton loader, retry button, slow-loading hint)
// used across the Balances / Activity / NFTs / Prices sections. Deliberately
// minimal — no UI library.
import { useEffect, useState, type ReactNode } from 'react'

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-pulse rounded bg-neutral-800 light:bg-neutral-200 ${className}`}
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
          className="rounded-lg border border-neutral-700 light:border-neutral-300 px-3 py-1 text-xs text-neutral-300 light:text-neutral-700 hover:border-purple-500 hover:text-purple-300"
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

/** "0x1234…abcd" — used for compact contract/address display everywhere. */
export function shortAddress(address: string, lead = 6, trail = 4): string {
  if (address.length <= lead + trail + 1) return address
  return `${address.slice(0, lead)}…${address.slice(-trail)}`
}

/**
 * Small inline "Copy" button with transient "Copied!" feedback — used for
 * contract addresses, wallet addresses, anywhere a value needs a one-click
 * copy without its own bespoke state.
 */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be blocked (permissions, insecure context) — not
      // worth surfacing as an error for a convenience action.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-neutral-700 light:border-neutral-300 px-1.5 py-0.5 text-[10px] leading-4 text-neutral-500 hover:border-purple-500 hover:text-purple-300"
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

/**
 * Small, muted "where this data comes from" note — shown under a section
 * header so the data's provenance is always visible without taking up
 * much visual weight.
 */
export function DataSourceNote({ children }: { children: ReactNode }) {
  return <p className="text-[11px] text-neutral-600 light:text-neutral-500">{children}</p>
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
