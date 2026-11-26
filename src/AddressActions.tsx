// Copy-to-clipboard + QR code for the address currently being viewed
// (connected wallet or a watch-only address — works identically for both,
// no network call: QR is generated entirely client-side via the `qrcode`
// package, nothing about the address ever leaves the browser).
//
// QR is rendered dark-on-white at a decent fixed resolution — high
// contrast is what actually matters for a phone camera to lock onto it
// reliably, which a tinted/transparent QR on a dark page does not give you
// — and opens in a full-screen modal (not a small inline dropdown) so it's
// always shown big enough to scan without zooming.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { CopyButton } from './ui'

const QR_SIZE = 288

function QrModal({ address, onClose }: { address: string; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(address, {
      width: QR_SIZE,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#ffffff' },
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-neutral-700 bg-neutral-900 p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-neutral-100">Scan to get address</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-neutral-400 hover:text-neutral-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mx-auto flex items-center justify-center rounded-xl bg-white p-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Address QR code"
              width={QR_SIZE}
              height={QR_SIZE}
              className="block"
            />
          ) : (
            <div
              style={{ width: QR_SIZE, height: QR_SIZE }}
              className="flex items-center justify-center text-xs text-neutral-500"
            >
              QR unavailable
            </div>
          )}
        </div>

        <p className="mt-4 break-all font-mono text-xs text-neutral-400">{address}</p>
        <div className="mt-3 flex justify-center">
          <CopyButton value={address} label="Copy address" />
        </div>
      </div>
    </div>
  )
}

export default function AddressActions({ address }: { address: string }) {
  const [showQr, setShowQr] = useState(false)

  return (
    <div className="flex items-center gap-1.5">
      <CopyButton value={address} />
      <button
        type="button"
        onClick={() => setShowQr(true)}
        className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-purple-500 hover:text-purple-300"
      >
        QR
      </button>

      {showQr && <QrModal address={address} onClose={() => setShowQr(false)} />}
    </div>
  )
}
