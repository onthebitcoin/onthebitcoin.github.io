// Copy-to-clipboard + QR code for the address currently being viewed
// (connected wallet or a watch-only address — works identically for both,
// no network call: QR is generated entirely client-side via the `qrcode`
// package, nothing about the address ever leaves the browser).
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function AddressActions({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(address, {
      width: 160,
      margin: 1,
      color: { dark: '#e5e5e5', light: '#00000000' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [address])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can be blocked (permissions, insecure context) —
      // not worth surfacing as an error for a convenience action.
    }
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-purple-500 hover:text-purple-300"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <button
        type="button"
        onClick={() => setShowQr((v) => !v)}
        className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-purple-500 hover:text-purple-300"
      >
        QR
      </button>

      {showQr && (
        <div className="absolute right-0 top-full z-10 mt-2 rounded-xl border border-neutral-700 bg-neutral-950 p-3 shadow-xl">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Address QR code" className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-xs text-neutral-500">
              QR unavailable
            </div>
          )}
        </div>
      )}
    </div>
  )
}
