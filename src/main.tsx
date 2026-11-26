import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import './index.css'
import App from './App.tsx'
import { wagmiConfig } from './wagmi.ts'
import { ViewingAddressProvider } from './viewingAddress.tsx'
import { SelectedChainProvider } from './selectedChain.tsx'
import { ThemeProvider, useTheme } from './theme.tsx'

const queryClient = new QueryClient()

// Picks RainbowKit's own theme to match ours — has to live inside
// ThemeProvider (to read the current theme via the hook) but outside App
// (RainbowKitProvider must wrap everything that uses wallet-connect UI).
function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()
  return (
    <RainbowKitProvider theme={theme === 'light' ? lightTheme() : darkTheme()}>
      {children}
    </RainbowKitProvider>
  )
}

// Note: StrictMode is intentionally NOT used here. In dev it double-invokes
// effects, which makes wagmi's injected connector fire two
// eth_requestAccounts calls to MetaMask. MetaMask only resolves the first;
// the second hangs forever, which looks like "stuck on Confirm connection"
// even after you approve in the extension.
createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedRainbowKit>
          <ViewingAddressProvider>
            <SelectedChainProvider>
              <App />
            </SelectedChainProvider>
          </ViewingAddressProvider>
        </ThemedRainbowKit>
      </ThemeProvider>
    </QueryClientProvider>
  </WagmiProvider>,
)
