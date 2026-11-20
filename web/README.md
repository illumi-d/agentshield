# AgentShield — Frontend

Static site (Vite + React + wagmi/viem). No backend, no session storage on any server.

**Live (production, Vercel): https://agentshield-three-blush.vercel.app** — project `agentshield` under the owner's Vercel account; redeploy with `npx vercel --prod` from this folder.

## Run
```bash
npm install
npm run dev      # local dev
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

## Pages
1. **Beranda & Registrasi** — live registry stats, wallet connect (injected / WalletConnect), Agent ID ownership check, policy form with a mandatory transaction preview before signing. On BSC Testnet it can also mint a Mock Agent ID for testing.
2. **Dashboard Saya** — Shield Score, badge tier, streak stats, check-in (with preview), policy update.
3. **Developer** — contract addresses, read-interface snippets, Shield Score formula, owner-permission disclosure.

## Config
- Networks & contract addresses: `src/config.ts` (testnet is live; mainnet registry address is `null` until the mainnet deploy).
- Optional WalletConnect: copy `.env.example` to `.env` and set `VITE_WC_PROJECT_ID`. Without it, only injected wallets are offered — which covers the Binance Wallet in-app dApp browser.
- ABIs in `src/abi.ts` are generated from the Foundry artifacts in `../out/` — regenerate after any contract change.
