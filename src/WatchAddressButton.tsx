// Prominent, always-visible "Watch address" button next to Connect Wallet —
// the main entry point for watch-only usage. Opens a small popover with a
// paste-and-add form; does not require (or touch) a connected wallet at all.
import { useState, type FormEvent } from 'react'
import { useViewingAddress } from './viewingAddress'

export default function WatchAddressButton() {
  const { addWallet } = useViewingAddress()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const result = addWallet(input)
    if (!result.ok) {
      setError(result.error ?? 'Invalid address.')
      return
    }
    setInput('')
    setError(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-purple-500/60 bg-purple-500/10 px-4 py-2.5 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20"
      >
        👁 Watch address
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-xl">
          <p className="mb-2 text-xs text-neutral-400">
            Paste any 0x address to view it read-only — no wallet connection
            needed.
          </p>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x... address to watch"
              className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
            >
              Add
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <p className="mt-2 text-xs text-neutral-600">
            Read-only, saved only in this browser — never connected, never
            asked to sign anything.
          </p>
        </div>
      )}
    </div>
  )
}
