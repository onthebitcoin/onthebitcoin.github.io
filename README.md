# OnTheBitcoin — Multi-Chain Wallet Dashboard

> Bitcoin is the answer.

A local-first, read-only wallet dashboard by **OnTheBitcoin**
([@OnTheBitcoin](https://x.com/OnTheBitcoin) on X), tracking balances,
activity, and NFTs across **Base**, **Ink (Inkonchain)**, **Optimism**,
**Arbitrum**, and **OpenSea**. Built to demonstrate practical Web3 frontend
work — wallet connect, multi-chain data, and third-party API integration —
and used in daily personal workflow to monitor wallet holdings across
several chains from one screen.

![tech](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Vite-blue)
![tech](https://img.shields.io/badge/web3-wagmi%20%2B%20viem%20%2B%20RainbowKit-purple)
![tech](https://img.shields.io/badge/license-MIT-green)

**Live demo:** [onthebitcoin.github.io](https://onthebitcoin.github.io/)

> **For Upwork / client pitches:** "I built OnTheBitcoin, a read-only
> multi-chain wallet dashboard (React, TypeScript, wagmi/viem, RainbowKit)
> that tracks balances, transaction history, NFTs, and portfolio USD value
> across Base, Ink, Optimism, and Arbitrum — plus watch-only support for any
> address, CSV export, and clean loading/error states throughout. It's live,
> open-source, and something I use myself daily to track my own wallets."

## Screenshot

![OnTheBitcoin dashboard — balances, activity across Base, Ink, Optimism and Arbitrum](./docs/screenshot.png)

_Watch-only view of a real public address — no wallet connection needed to see this._

## What it does

- **Pick one chain at a time.** A tab bar (Base / Ink / Optimism / Arbitrum)
  controls everything below it — Balances, Activity, NFTs, and Wallet
  Analysis all scope to whichever chain is selected, defaulting to Base.
  Only that one chain's data is fetched and rendered, so the page stays
  light and focused instead of loading four chains in parallel. Your choice
  is remembered across refreshes (`localStorage`).
- **Watch any address with one click.** A prominent "👁 Watch address"
  button sits right next to Connect Wallet — paste a 0x address, no wallet
  connection needed at all. Switch between your connected wallet and any
  number of saved addresses at any time (the wallet-chip row below the
  header); everything on the page follows whichever one is active.
- **Wallet analysis at a glance.** Once an address and chain are selected, a
  summary panel shows the estimated USD value, transactions loaded,
  sent/received split, and NFT count for that chain, plus simple heuristic
  tags ("Active wallet", "Low activity", "NFT holder", "Mostly
  receiving"/"Mostly sending") computed from what's already loaded — no
  extra fetches, just a read-only view over the same data the sections
  below already have.
- **Balances**: native balance plus every ERC-20 token the address actually
  holds on the selected chain (Blockscout's token-balances endpoint — not a
  hardcoded shortlist), sorted by estimated USD value and capped to the top
  20 so a wallet holding hundreds of spam/dust tokens stays fast and
  readable. One-click chain switch for the connected wallet, CSV export.
- **Recent activity**: last transactions on the selected chain — time,
  action (Sent/Received + decoded method name), value, and a link to the
  block explorer. A summary line (loaded count, sent/received split, rough
  native-token volume) sits above the table, and clicking any row opens a
  detail view (full hash, full timestamp, method, from/to, status). Loads
  20 at a time with a "Load more" button, so a very active wallet never
  freezes the page rendering hundreds of rows at once. Filter by
  Sent/Received, export the full loaded list to CSV.
- **NFTs**: image grid of the selected chain's NFTs (Base, Optimism, and
  Arbitrum via OpenSea; Ink shows a clear "not supported yet" message
  instead of a broken fetch, since there's no reliable public NFT indexer
  for it), with a search box to filter by name/collection, and "Load more"
  pagination (OpenSea's own cursor) for large collections — each card gets
  its own image skeleton and a graceful fallback if an image fails to load.
- **Export to CSV**: both the balances table and the activity table for
  the currently selected chain export with one click — handy for taxes,
  spreadsheets, or just backing up what you're tracking.
- **Copy address + QR code**: next to whichever address you're viewing
  (connected or watch-only), a Copy button with "Copied!" feedback and a
  QR code generated entirely client-side (the `qrcode` package — the
  address never goes to a third-party API just to render a QR).
- **Quick links to external tools, per chain.** `toolsByChain.ts` maps each
  chain to its own short list of popular apps — Jumper and LI.FI (cross-chain
  aggregators) on every chain, plus chain-native ones: Uniswap + Aerodrome
  on Base, Nado + Tydro + Inkypump on Ink, Velodrome + Uniswap on Optimism,
  GMX + Camelot + Uniswap on Arbitrum. Switching chains updates the list
  immediately. Always visible (no wallet or address needed) — pure
  `target="_blank"` navigation, no swap logic lives in this app at all.
  Adding a tool or a chain is one more entry in that one config file.
- **Add token to wallet**: one click adds a known ERC-20 (USDC/WETH) to your
  connected wallet's token list via EIP-747 `wallet_watchAsset` — display
  only, cannot move funds or need approval, shown only when the connected
  wallet is actually on the selected chain.
- **Dark mode, responsive** (desktop and mobile), with loading skeletons,
  empty states, and error states with a retry button throughout. Any fetch
  that's still running after ~1.2–1.5s also shows a specific text hint (e.g.
  "Loading activity on Base…", "Fetching NFT metadata for Base…") so a slow
  network never just looks frozen — including right after switching chains,
  where every section resets to a clean loading/skeleton state immediately.
- **Resilient networking.** Every external call (Blockscout, OpenSea,
  CoinGecko) goes through a shared helper (`net.ts`) with a hard timeout and
  one quiet retry on timeout/network errors (never on a real 4xx, since
  repeating those wastes time for the same result). Errors are specific —
  "timed out", "rate limited", "network error", "API key rejected" — never a
  generic "something went wrong", and each section's error is fully isolated
  with its own Retry button, so one slow or failing API never blocks or
  crashes the rest of the page.
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
| Transaction history | Blockscout API v2 | public, no API key, same schema across Base, Ink, Optimism, Arbitrum |
| Token balances | Blockscout API v2 | full token list + Blockscout's own USD exchange rate per token, no API key |
| NFTs | OpenSea API v2 | official NFT ownership data, free instant API key |
| Portfolio value | CoinGecko public API | free, no API key, native ETH price only (tokens price via Blockscout above) |
| Data fetching/caching | TanStack Query | loading/error states, caching, retry, built into wagmi |
| QR codes | `qrcode` | tiny, generates client-side, no third-party API call |

## Project structure

```
public/
  favicon.ico, icons/           favicon + apple-touch-icon, generated from images/otb-r1c.png
  images/otb-r1c.png            OnTheBitcoin logo (header + favicon source)
  images/onthebitcoin-banner@2x.png   OnTheBitcoin brand banner (shown pre-connect)
src/
  wagmi.ts         wagmi/RainbowKit config: chains, connectors, WalletConnect id
  blockscout.ts    Blockscout API v2 client (recent activity, 4 chains)
  tokenBalances.ts     Blockscout token-balances client (full token list + USD rate per token)
  opensea.ts       OpenSea API v2 client (NFTs by account)
  prices.ts        CoinGecko client for native ETH price
  viewingAddress.tsx  multi-wallet state: connected wallet vs watched addresses (localStorage)
  selectedChain.tsx    single-chain-at-a-time state (localStorage), SUPPORTED_CHAINS list
  WalletSwitcher.tsx   wallet-chip row: switch between connected/watched addresses
  WatchAddressButton.tsx  prominent "Watch address" button + add-address popover
  ChainTabs.tsx        chain picker tabs (Base/Ink/Optimism/Arbitrum)
  WalletAnalysis.tsx   combined summary panel (USD value, tx count, sent/received, NFTs, tags)
  csv.ts           tiny client-side CSV export helper (no dependency)
  net.ts           shared fetch helper: timeout + one quiet retry, typed TimeoutError/HttpError
  ui.tsx           shared Skeleton / ErrorState / EmptyState + useSlowLoading hook
  AddressActions.tsx  Copy-to-clipboard + client-side QR code for the viewed address
  ExternalTools.tsx   quick links out, per selected chain (toolsByChain.ts config)
  toolsByChain.ts      config: which external tools show on each chain
  Balances.tsx     balance section for the selected chain, chain switcher
  Activity.tsx     recent transactions table for the selected chain
  Nfts.tsx         NFT grid for the selected chain
  App.tsx          page layout, header/footer, OnTheBitcoin branding, wires sections together
  main.tsx         React root, wagmi/query/RainbowKit/ViewingAddress/SelectedChain providers
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
instead of silently failing (and distinguishes "key missing" from "key
rejected / expired" if one is set but invalid). Without
`VITE_WALLETCONNECT_PROJECT_ID` everything still works via injected wallets;
only WalletConnect itself is disabled.

## Supported chains

| Chain | Chain ID | Explorer used | NFTs (OpenSea) |
|---|---|---|---|
| Base | 8453 | base.blockscout.com | ✅ |
| Ink (Inkonchain) | 57073 | explorer.inkonchain.com | not yet (no public indexer) |
| Optimism | 10 | explorer.optimism.io | ✅ |
| Arbitrum One | 42161 | arbitrum.blockscout.com | ✅ |

All four L2s share the same Blockscout v2 API schema, so `blockscout.ts`
and `tokenBalances.ts` handle activity and token balances for all of them
with one typed client each — adding a chain is just a new entry in the
`BLOCKSCOUT_CHAINS` map (shared by both), `selectedChain.tsx`'s
`SUPPORTED_CHAINS` list, and `Nfts.tsx`'s OpenSea slug map if the chain has
NFT support.

## Notable implementation decisions

- **No `<StrictMode>`.** In dev, StrictMode double-invokes effects, which
  makes wagmi's injected connector fire two `eth_requestAccounts` calls.
  MetaMask/Coinbase Wallet only resolve the first, so the second hangs
  forever — this looks exactly like a stuck "Confirm connection" even after
  approving in the extension.
- **wagmi v3's `useBalance` only returns the native balance** (no `token`
  option, no `.formatted` field, unlike wagmi v2). ERC-20 balances are read
  via `useReadContract` + viem's `erc20Abi`, formatted with `formatUnits`.
- **One Blockscout client covers all four L2s.** Base, Ink, Optimism, and
  Arbitrum all run public Blockscout instances with the same v2 API schema,
  so a single typed client handles transaction history for all of them — no
  custom indexer, no API key. Note: Optimism's instance moved domains, from
  `optimism.blockscout.com` (now 301-redirects) to `explorer.optimism.io`.
- Every data section (Balances, Activity, NFTs) independently handles
  loading (skeletons), empty, and error (with retry) states, so a slow or
  failing third-party API never breaks the rest of the page.
- **Token balances come from Blockscout, not a hardcoded list.** An earlier
  version only showed USDC/WETH because those were the only token addresses
  hand-entered per chain — accurate for those two tokens, but wildly
  understated the real balance for any wallet holding other tokens (e.g. an
  Ink address holding mostly meme tokens showed ~$0.18 instead of the real
  ~$57). `tokenBalances.ts` now calls Blockscout's
  `/addresses/{address}/token-balances` endpoint, which returns every ERC-20
  the address holds *and* Blockscout's own USD `exchange_rate` per token —
  so there's no need to map arbitrary token symbols to a CoinGecko id (which
  would be unreliable for a long tail of random/spam tokens anyway).
  Verified against Blockscout's own "Net Worth" figure for a real Ink
  address and got an exact match ($57.35). Tokens Blockscout has no rate for
  simply show "—" for USD value rather than guessing. Capped to the top 20
  by USD value, since some wallets hold 400+ spam/dust tokens — fetching and
  rendering all of them would be slow for no benefit.
- **Native token price is still CoinGecko, best-effort and non-blocking.**
  The token-balances endpoint only covers ERC-20s, so native ETH still
  prices via CoinGecko's free public endpoint (no key). If that request
  fails, balances still display normally — only the `$` figures fall back
  to "—" and a small "prices unavailable — retry" note appears next to the
  chain's estimated value.
- **Multi-wallet is watch-only by construction.** `viewingAddress.tsx` just
  resolves one `address` — either the connected wallet's, or a saved one from
  `localStorage` — and every section reads balances/activity/NFTs for
  whichever address that is. Watched addresses are never passed to a
  connector, never asked to sign anything; "Switch chain" is hidden for them
  since chain-switching only means something for an actual connected wallet.
- **Switching chain/address remounts Balances, Activity and Nfts together,
  grouped under one keyed `<Fragment>` in `App.tsx`.** Earlier, each had its
  own manual "reset on chain change" effect; those raced in subtle ways —
  a lingering old-chain instance could still fire its summary callback
  after a switch and leave Wallet Analysis showing one chain's tags next to
  a different chain's numbers (reported bug: "NFT holder" tag with "NFTs 0"
  shown together). A single key over the whole group forces a clean
  unmount+mount of all three at once instead of coordinating separate
  resets, which removes that whole category of stale-callback bugs.
- **"Add to wallet" is read-only too, despite touching the wallet.**
  `wallet_watchAsset` (EIP-747) only asks the wallet to *display* a token —
  it's the same permission level as adding a bookmark, not a transaction, so
  it needs no confirmation dialog in this app and carries no custody risk.
  It's only shown next to tokens on the chain the connected wallet is
  actually active on (watch-only addresses never show it, since there's no
  wallet to update).
- **Loading feedback has two tiers on purpose.** A skeleton appears
  immediately for every fetch (so the UI is never blank), but the *text*
  hint ("Loading activity on Base…") only appears via `useSlowLoading()`
  after a short delay — this avoids flashing text on every normal fast load,
  while still telling the user clearly what's taking a while if the network
  or an API is actually slow.
- **Activity and NFTs paginate instead of loading everything.** Both fetch a
  bounded first page (20 transactions / 24 NFTs) and expose "Load more"
  using each API's own cursor (Blockscout's `next_page_params`, OpenSea's
  `next`). A wallet with thousands of transactions or a large NFT collection
  never has to render — or wait for — all of it up front. CSV export always
  covers everything loaded so far, not just the first page.
- **Activity summary stats are honestly scoped to "loaded", not "total".**
  Blockscout's API doesn't expose a cheap total-transaction count, so the
  sent/received/volume line reflects exactly what's been fetched so far
  (first page, or more after "Load more") — the label says "loaded" rather
  than implying it's the wallet's entire lifetime activity.
- **Every new feature in this round works with zero wallet connected.**
  Quick-action links, copy/QR, activity summary, and the transaction detail
  view all operate on whichever address `viewingAddress.tsx` resolves to —
  connected or watch-only — with no code path that requires a live
  connector. QR generation is fully client-side specifically so pasting a
  watch-only address never sends it to a third party just to render a code.
- **Single-chain-at-a-time is a deliberate performance and clarity choice.**
  `selectedChain.tsx` holds exactly one chain id; Balances/Activity/Nfts all
  read it and fetch/render only that chain, instead of the four-chain grid
  the app used to show. This keeps API calls and rendered DOM proportional
  to "one chain" rather than "every chain", and avoids the cognitive load
  of four simultaneous balance cards and activity tables.
- **Wallet Analysis reads, never re-fetches.** `App.tsx` holds three small
  pieces of state (`usdTotal`, `activitySummary`, `nftCount`) that
  Balances/Activity/Nfts report up via callback props as their own queries
  resolve — `WalletAnalysis.tsx` is a pure display component over these,
  with zero network calls of its own.
- **Avoided a parent/child effect race when resetting on chain change.** An
  earlier version had `App.tsx` reset all three analysis values to `null`
  in its own `useEffect` keyed on `[chainId, address]` — but React fires a
  child's effects before its parent's in the same commit, so that reset
  would run *after* a child (e.g. `Nfts.tsx` reporting `0` for Ink, which
  has no NFT support) had already reported its real value, silently
  clobbering it back to `null`. Fixed by making each section fully
  self-sufficient: it reports `null` while its own query is loading for the
  new chain/address, and the real value once resolved — no parent-level
  reset needed or present anymore.

## Possible next steps

- Code-split RainbowKit's wallet/locale chunks (currently one ~900KB bundle;
  works fine, just not minimal).
- Add Ink NFT support once a reliable Ink-native NFT indexer is available.
- Light mode toggle (currently dark-only by design).

## License

MIT — free to use, fork, or adapt.
