// Tiny shared UI bits (skeleton loader, retry button) used across the
// Balances / Activity / NFTs sections. Deliberately minimal — no UI library.
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
