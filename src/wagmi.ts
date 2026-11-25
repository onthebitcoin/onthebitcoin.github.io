// Wagmi/RainbowKit config: chains + connectors for the dashboard.
// Get a free WalletConnect Cloud project id at https://cloud.walletconnect.com
// and put it in .env.local as VITE_WALLETCONNECT_PROJECT_ID to enable
// WalletConnect (mobile wallets, etc). Injected wallets (MetaMask, Rabby...)
// work out of the box even with the placeholder id below.
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { base, ink, mainnet } from 'viem/chains'

const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID'

export const wagmiConfig = getDefaultConfig({
  appName: 'Ink & Base Activity Dashboard',
  projectId: walletConnectProjectId,
  chains: [base, ink, mainnet],
  ssr: false,
})
