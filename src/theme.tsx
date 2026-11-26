// Dark/Light mode toggle. Dark is the app's original/default look — nearly
// every existing className in this codebase already encodes the dark
// palette directly (bg-neutral-950, text-neutral-100, etc.), so rather
// than inverting everything, light mode is modeled as an OVERRIDE: adding
// a `light` class to <html> activates a custom Tailwind variant
// (`light:...`, defined in index.css) that's appended next to the
// existing dark classes throughout the app. No class on <html> = dark
// (unchanged original behavior).
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'onthebitcoin:theme'

function loadInitialTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark') return raw
  } catch {
    // ignore — fall through to default
  }
  return 'dark'
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage can be unavailable (private mode, quota) — not
      // critical, the choice just won't survive a refresh.
    }
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
