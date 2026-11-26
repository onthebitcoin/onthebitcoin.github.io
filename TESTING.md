# Testing OnTheBitcoin

Manual test checklist run before each production push, plus how to run a
Lighthouse quality check. There's no automated test suite (no backend, no
business logic complex enough to warrant one yet — see "Why no unit tests"
below) — this is the repeatable manual pass instead.

## Checklist (run this before every push to `main`)

Use a real address with actual balances/activity/NFTs on at least one
chain (e.g. `0x02D516A3Aa347aCFa3e6c97053c6aeA6D037A48C`, reused
throughout development — holds dust on Base/Ink/Optimism/Arbitrum).

### Watch-only mode (no wallet connected)
- [ ] "Watch address" button adds an address and switches to it
- [ ] Opening `/?address=0x...` auto-adds and auto-selects that address
- [ ] Switching chains (Base/Ink/OP Mainnet/Arbitrum) updates every
      section — Balances, Activity, NFTs, Wallet analysis — with no stale
      numbers left over from the previous chain
- [ ] Removing a watched address (×) works and doesn't crash if it was
      the one currently selected

### Connected wallet mode
- [ ] "Connect Wallet" opens RainbowKit's modal
- [ ] After connecting, the connected address becomes the default viewed
      address; watched addresses still selectable via the wallet switcher
- [ ] Current chain reflects the wallet's actual chain

### Balances
- [ ] Native token + ERC-20s load, sorted by USD value, capped to top 20
      with a "+N more" note when truncated
- [ ] Search box filters by symbol/name/contract, live, case-insensitive
- [ ] "Hide < $1" toggle hides small balances and persists across reloads
      (`localStorage['onthebitcoin:hide-small-balances']`)
- [ ] Each ERC-20 row: shortened contract + Copy + "View" link to the
      right explorer; native token labeled "Native token — no contract"
- [ ] Portfolio donut chart renders once ≥1 priced token, with an "Other"
      bucket for the long tail; absent entirely when there's no data
- [ ] Gas price badge shows a value or is silently absent (no error UI)
- [ ] CSV export produces one row per token, matching what's on screen

### Activity
- [ ] Loads 20 most recent txs, "Load more" paginates another 20
- [ ] Summary line's loaded/sent/received/volume/24h counts match the
      visible rows exactly
- [ ] Rows from the last 24h show the small purple "24h" badge + tint;
      older rows don't
- [ ] Sent/Received filter dropdown narrows the table correctly
- [ ] Clicking a row opens the detail view; "View on block explorer"
      link is correct for the selected chain
- [ ] CSV export matches the loaded rows

### NFTs
- [ ] Base / Optimism / Arbitrum: OpenSea-backed grid loads, paginates,
      search filters by name/collection
- [ ] Ink: Blockscout-backed grid loads (NOT "not supported" — this chain
      now has real data), count matches Wallet analysis's NFT count,
      "NFTs from Blockscout" source note is visible, broken/slow IPFS
      images fall back to a clean "No image" tile instead of a broken
      icon or layout shift
- [ ] Zero-NFT address shows a clear empty state, not a blank section

### Wallet analysis
- [ ] Est. value / Transactions (loaded) / Sent-Received / NFTs match the
      Balances/Activity/NFTs sections exactly on every chain
- [ ] Tags (Active wallet, NFT holder, Mostly sending/receiving, etc.)
      are consistent with the numbers shown, on every chain, immediately
      after a chain switch (no one-render-behind stale state)

### Theme & layout
- [ ] Light/dark toggle switches the whole app including RainbowKit's own
      modal; choice persists across reloads
      (`localStorage['onthebitcoin:theme']`)
- [ ] Both themes: text stays readable everywhere (header, tabs, cards,
      tables, badges) — no washed-out purple-on-purple or invisible text
- [ ] Mobile (375×812): header, chain tabs (horizontally scrollable),
      cards, balances list, NFT grid, and activity table all usable
      without horizontal overflow of the page itself

### Share link
- [ ] "Share" button copies a `?address=0x...` URL
- [ ] Opening that URL fresh (no prior localStorage) loads straight into
      watch-only mode for that address

### Resilience
- [ ] A forced render error (temporarily throwing in `App()`, see commit
      history for the exact throwaway test) is caught by `ErrorBoundary`
      and shows the friendly fallback + reload button, not a blank
      white screen
- [ ] Any single section's API failure (e.g. simulate by blocking one
      Blockscout host) shows that section's own retry-able error state
      without taking down the rest of the page

## Quality checks

### Lighthouse
```bash
npx lighthouse https://onthebitcoin.github.io/ \
  --output=json --output-path=./lighthouse-report.json \
  --chrome-flags="--headless --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo
```
Last run against production: **Performance 77, Accessibility 92,
Best Practices 100, SEO 100.**

Known, accepted finding: the remaining `color-contrast` flag is on
RainbowKit's own `ConnectButton` markup (third-party component, not our
CSS) — not touched, to avoid fragile overrides into a library's internal
class names. Everything else the app itself renders was checked and
fixed where it fell short (several `text-neutral-500`/`600` labels bumped
to `-400`/`-500` for sufficient contrast on the dark background).

Performance is bounded mostly by bundle size (wagmi + viem + RainbowKit +
TanStack Query, by nature a sizeable dependency set for a wallet dapp) —
code-splitting with dynamic `import()` per chain/section would be the
next lever if this needs to move further, not attempted here to keep this
round's scope to the requested features.

### Cross-browser
No automated cross-browser suite. Manually verified this round in a
Chromium-based headless browser (desktop + mobile viewport emulation).
Recommended manual spot-check before a major release: open the live URL
once each in actual Firefox and Safari (WalletConnect/RainbowKit's modal
and `prefers-color-scheme`-adjacent CSS are the most likely things to
differ across engines) — not run as part of this round due to the
automation only having one Chromium-based browser available.

## Why no automated unit/e2e test suite (yet)
The app is a thin read-only presentation layer over a few well-isolated
API clients (`blockscout.ts`, `tokenBalances.ts`, `blockscoutNfts.ts`,
`opensea.ts`, `prices.ts`, `gasPrice.ts`). The riskiest logic historically
(the Wallet-Analysis chain-switch race, the Ink balance undercounting)
was found and fixed via live manual testing with real addresses rather
than unit tests, because the bugs were about live data shape and React
reconciliation timing, not pure functions. If this grows further, the
highest-value first automated tests would be: Vitest unit tests for the
pure mapping/aggregation functions in the API client modules (not the
network calls themselves), and a Playwright smoke test for the watch-only
+ share-link + chain-switch flow against a mocked API.
