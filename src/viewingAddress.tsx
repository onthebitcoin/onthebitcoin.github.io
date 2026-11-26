// Multi-wallet (watch-only) support: lets the user view balances/activity/
// NFTs for any saved address, not just the one connected via RainbowKit.
// Watched addresses are pure UI state + localStorage — never touched by any
// signing flow, never given to a connector. Read-only by construction: every
// consumer (Balances/Activity/Nfts) just passes this address into wagmi's
// read-only hooks (useBalance/useReadContract) the same way it already did
// for the connected wallet.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useAccount } from 'wagmi'
import { isAddress, type Address } from 'viem'

export interface WatchedWallet {
  address: Address
  label?: string
}

const STORAGE_KEY = 'onthebitcoin:watched-wallets'

function loadWallets(): WatchedWallet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as WatchedWallet[]) : []
  } catch {
    return []
  }
}

function saveWallets(wallets: WatchedWallet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
}

interface AddWalletResult {
  ok: boolean
  error?: string
}

interface ViewingAddressContextValue {
  address: Address | undefined
  isConnectedWallet: boolean
  watchedWallets: WatchedWallet[]
  addWallet: (input: string, label?: string) => AddWalletResult
  removeWallet: (address: Address) => void
  viewConnectedWallet: () => void
  viewWallet: (address: Address) => void
}

const ViewingAddressContext = createContext<ViewingAddressContextValue | null>(null)

export function ViewingAddressProvider({ children }: { children: ReactNode }) {
  const { address: connectedAddress, isConnected } = useAccount()
  const [watchedWallets, setWatchedWallets] = useState<WatchedWallet[]>(() => loadWallets())
  const [selected, setSelected] = useState<Address | null>(null)

  useEffect(() => {
    saveWallets(watchedWallets)
  }, [watchedWallets])

  // Shareable watch-only links: opening the app with ?address=0x... adds
  // that address to the watch list (if not already there) and selects it
  // immediately — a one-click way to hand someone a read-only view of a
  // specific address without them typing anything in.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = params.get('address')
    if (!shared || !isAddress(shared.trim())) return
    const addr = shared.trim() as Address
    setWatchedWallets((prev) => {
      if (prev.some((w) => w.address.toLowerCase() === addr.toLowerCase())) return prev
      return [...prev, { address: addr }]
    })
    setSelected(addr)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const address = selected ?? (isConnected ? connectedAddress : undefined)
  const isConnectedWallet = Boolean(
    selected === null && isConnected && address === connectedAddress,
  )

  function addWallet(input: string, label?: string): AddWalletResult {
    const trimmed = input.trim()
    if (!isAddress(trimmed)) {
      return { ok: false, error: 'Not a valid 0x address.' }
    }
    const addr = trimmed as Address
    if (watchedWallets.some((w) => w.address.toLowerCase() === addr.toLowerCase())) {
      return { ok: false, error: 'Already in your watch list.' }
    }
    setWatchedWallets((prev) => [...prev, { address: addr, label }])
    setSelected(addr)
    return { ok: true }
  }

  function removeWallet(addr: Address) {
    setWatchedWallets((prev) =>
      prev.filter((w) => w.address.toLowerCase() !== addr.toLowerCase()),
    )
    setSelected((prev) => (prev?.toLowerCase() === addr.toLowerCase() ? null : prev))
  }

  function viewConnectedWallet() {
    setSelected(null)
  }

  function viewWallet(addr: Address) {
    setSelected(addr)
  }

  return (
    <ViewingAddressContext.Provider
      value={{
        address,
        isConnectedWallet,
        watchedWallets,
        addWallet,
        removeWallet,
        viewConnectedWallet,
        viewWallet,
      }}
    >
      {children}
    </ViewingAddressContext.Provider>
  )
}

export function useViewingAddress(): ViewingAddressContextValue {
  const ctx = useContext(ViewingAddressContext)
  if (!ctx) {
    throw new Error('useViewingAddress must be used within ViewingAddressProvider')
  }
  return ctx
}
