// Wagmi/RainbowKit config: chains + connectors for the dashboard.
// Get a free WalletConnect Cloud project id at https://cloud.walletconnect.com
// and put it in .env.local as VITE_WALLETCONNECT_PROJECT_ID to enable
// WalletConnect (mobile wallets, etc). Injected wallets (MetaMask, Rabby...)
// work out of the box even with the placeholder id below.
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { arbitrum, base, ink, mainnet, optimism } from 'viem/chains'

// WalletConnect project id is only needed for the WalletConnect/mobile-QR
// connection path — injected wallets (MetaMask, Rabby, Coinbase extension,
// etc.) connect directly via window.ethereum and don't need it at all. A
// placeholder here is fine for local dev; set a real one in production via
// VITE_WALLETCONNECT_PROJECT_ID for the WalletConnect button to actually work.
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID'

export const wagmiConfig = getDefaultConfig({
  appName: 'OnTheBitcoin',
  projectId: walletConnectProjectId,
  chains: [base, ink, optimism, arbitrum, mainnet],
  ssr: false,
})
