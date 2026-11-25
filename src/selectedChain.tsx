// Which chain is currently selected for the "single chain at a time" view.
// Persisted to localStorage so a refresh keeps your last choice. Defaults to
// Base. All data sections (Balances/Activity/NFTs) read this and only
// fetch/render for this one chain — keeps the UI light and focused instead
// of loading all four chains in parallel.
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { arbitrum, base, ink, optimism } from 'viem/chains'

export const SUPPORTED_CHAINS = [base, ink, optimism, arbitrum]

const STORAGE_KEY = 'onthebitcoin:selected-chain'

function loadInitialChainId(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const id = raw ? Number(raw) : null
    if (id && SUPPORTED_CHAINS.some((c) => c.id === id)) return id
  } catch {
    // ignore — fall through to default
  }
  return base.id
}

interface SelectedChainContextValue {
  chainId: number
  setChainId: (id: number) => void
}

const SelectedChainContext = createContext<SelectedChainContextValue | null>(null)

export function SelectedChainProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainIdState] = useState<number>(loadInitialChainId)

  function setChainId(id: number) {
    setChainIdState(id)
    try {
      localStorage.setItem(STORAGE_KEY, String(id))
    } catch {
      // localStorage can be unavailable (private mode, quota) — not critical,
      // the selection just won't survive a refresh.
    }
  }

  return (
    <SelectedChainContext.Provider value={{ chainId, setChainId }}>
      {children}
    </SelectedChainContext.Provider>
  )
}

export function useSelectedChain(): SelectedChainContextValue {
  const ctx = useContext(SelectedChainContext)
  if (!ctx) {
    throw new Error('useSelectedChain must be used within SelectedChainProvider')
  }
  return ctx
}
