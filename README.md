# Ink & Base Activity Dashboard

A local-first, read-only dashboard for tracking wallet activity across
**Base**, **Ink (Inkonchain)**, and NFTs via **OpenSea**. Built to demonstrate
practical Web3 frontend work — wallet connect, multi-chain data, and
third-party API integration — and used in daily personal workflow to monitor
balances and NFT holdings across several chains from one screen.

![tech](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-blue)
![tech](https://img.shields.io/badge/web3-wagmi%20%2B%20viem%20%2B%20RainbowKit-purple)
![tech](https://img.shields.io/badge/license-MIT-green)

**Live demo:** [onthebitcoin.github.io](https://onthebitcoin.github.io/)

## Screenshot

<!--
  Add a real screenshot (connected wallet, with balances/activity/NFTs
  populated) here before publishing to a portfolio — a populated screenshot
  is the single highest-impact addition to this README.
  Markdown: ![Dashboard screenshot](./docs/screenshot.png)
-->

_Screenshot coming soon — see the live demo above in the meantime._

## What it does

- **Connect any wallet** (MetaMask, Coinbase Wallet, Rainbow, WalletConnect...)
  via RainbowKit.
- **Multi-chain balances**: native ETH plus USDC/WETH balances on Base and
  Ink, with a one-click chain switch.
- **Recent activity**: last transactions on Base and Ink — time, action
  (Sent/Received + decoded method name), value, and a link to the block
  explorer.
- **NFTs**: image grid of the connected wallet's NFTs on Base and Ethereum,
  linking out to their OpenSea listing.
- **Dark mode, responsive** (desktop and mobile), with loading skeletons,
  empty states, and error states with a retry button throughout.
- **No backend, no database** — every screen is a direct, client-side call to
  a public chain RPC or a public API (Blockscout, OpenSea). Nothing is stored
  or sent anywhere except those direct calls.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | Vite | fast dev server, simple config |
| UI | React 19 + TypeScript | type-safe, component-based |
| Styling | Tailwind CSS v4 | utility-first, no separate config file needed |
| Wallet connect | RainbowKit | polished connect UI out of the box |
| Chain interaction | wagmi v3 + viem | React hooks for balances, chain switching, contract reads |
| Transaction history | Blockscout API v2 | public, no API key, same schema on Base and Ink |
| NFTs | OpenSea API v2 | official NFT ownership data, free instant API key |
| Data fetching/caching | TanStack Query | loading/error states, caching, retry, built into wagmi |

## Project structure

```
src/
  wagmi.ts         wagmi/RainbowKit config: chains, connectors, WalletConnect id
  tokens.ts        known ERC-20 addresses per chain (Base, Ink)
  blockscout.ts    Blockscout API v2 client (recent activity)
  opensea.ts       OpenSea API v2 client (NFTs by account)
  ui.tsx           shared Skeleton / ErrorState / EmptyState components
  Balances.tsx     native + token balances section, chain switcher
  Activity.tsx     recent transactions table, per chain
  Nfts.tsx         NFT grid, per chain
  App.tsx          page layout, header/footer, wires the sections together
  main.tsx         React root, wagmi/query/RainbowKit providers
```

## Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL (defaults to `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

## Deployment

This repo deploys automatically to **GitHub Pages** via GitHub Actions
(`.github/workflows/deploy.yml`): every push to `main` runs `npm ci && npm run
build` and publishes `dist/` — see the live demo link above.

To set this up on your own fork/repo:

1. In the repo's GitHub Settings → Pages, set **Source** to "GitHub Actions".
2. In Settings → Secrets and variables → Actions, add the two secrets from
   `.env.example` (`VITE_WALLETCONNECT_PROJECT_ID`, `VITE_OPENSEA_API_KEY`).
3. Push to `main` (or re-run the workflow manually) — Actions builds and
   deploys automatically.

### Alternative: Vercel

Works just as well if you prefer Vercel's workflow:

1. Go to [vercel.com/new](https://vercel.com/new), import the repo — Vercel
   auto-detects the Vite framework preset, no config needed.
2. Add the same two environment variables in the Vercel project settings.
3. Deploy. Every push to `main` redeploys automatically.

## Environment variables (`.env.local`)

```bash
# WalletConnect Cloud project id — free at https://cloud.walletconnect.com
# Only needed for the WalletConnect (QR / mobile wallet) connector.
# Injected wallets (MetaMask, Coinbase Wallet, Rabby...) work without it.
VITE_WALLETCONNECT_PROJECT_ID=your_id_here

# OpenSea API key — required for the NFT section to load real data.
# Get an instant free key (no signup) per https://docs.opensea.io/reference/api-keys,
# or sign up at https://opensea.io/settings/developer for a longer-lived one.
VITE_OPENSEA_API_KEY=your_key_here
```

Without `VITE_OPENSEA_API_KEY` the NFT section shows a clear placeholder
instead of silently failing. Without `VITE_WALLETCONNECT_PROJECT_ID` everything
still works via injected wallets; only WalletConnect itself is disabled.

## Supported chains

| Chain | Chain ID | Explorer used |
|---|---|---|
| Base | 8453 | base.blockscout.com |
| Ink (Inkonchain) | 57073 | explorer.inkonchain.com |
| Ethereum (NFTs only) | 1 | opensea.io |

## Notable implementation decisions

- **No `<StrictMode>`.** In dev, StrictMode double-invokes effects, which
  makes wagmi's injected connector fire two `eth_requestAccounts` calls.
  MetaMask/Coinbase Wallet only resolve the first, so the second hangs
  forever — this looks exactly like a stuck "Confirm connection" even after
  approving in the extension.
- **wagmi v3's `useBalance` only returns the native balance** (no `token`
  option, no `.formatted` field, unlike wagmi v2). ERC-20 balances are read
  via `useReadContract` + viem's `erc20Abi`, formatted with `formatUnits`.
- **One Blockscout client covers both chains.** Base and Ink both run public
  Blockscout instances with the same v2 API schema, so a single typed client
  handles transaction history for both — no custom indexer, no API key.
- Every data section (Balances, Activity, NFTs) independently handles
  loading (skeletons), empty, and error (with retry) states, so a slow or
  failing third-party API never breaks the rest of the page.

## Possible next steps

- Code-split RainbowKit's wallet/locale chunks (currently one ~900KB bundle;
  works fine, just not minimal).
- Support tracking multiple saved wallet addresses (not just the connected
  one), useful for anyone managing several wallets across chains.
- Add Ink NFT support once a reliable Ink-native NFT indexer is available.

## License

MIT — free to use, fork, or adapt.
