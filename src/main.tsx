import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import './index.css'
import App from './App.tsx'
import { wagmiConfig } from './wagmi.ts'
import { ViewingAddressProvider } from './viewingAddress.tsx'

const queryClient = new QueryClient()

// Note: StrictMode is intentionally NOT used here. In dev it double-invokes
// effects, which makes wagmi's injected connector fire two
// eth_requestAccounts calls to MetaMask. MetaMask only resolves the first;
// the second hangs forever, which looks like "stuck on Confirm connection"
// even after you approve in the extension.
createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider theme={darkTheme()}>
        <ViewingAddressProvider>
          <App />
        </ViewingAddressProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>,
)
