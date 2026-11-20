# AgentShield

**An on-chain security-policy registry for Agent ID holders on BNB Chain.**
Built for the Agent ID Hackathon (Binance Wallet × BNB Chain).

**Live site:** https://agentshield-three-blush.vercel.app · **Repository:** https://github.com/illumi-d/agentshield

An agent registers the safety rules it operates under — always requiring manual user confirmation, never using unlimited token approvals, simulating before signing, plus a maximum transaction value — bound to its Agent ID identity. Holders prove their agent is active and still under their control through periodic on-chain check-ins that build a streak and a badge tier. These signals combine into a public **Shield Score** that any dApp can read before interacting with an agent.

## Why Agent ID is core, not a gate
- Registration requires holding an Agent ID (SPACE ID Agent ID, BNB Chain: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`) **and** owning the exact token being registered: the registry verifies `ownerOf(agentTokenId) == msg.sender` on-chain.
- Agent IDs are non-transferable and limited to one per user, so one registration per identity is sybil-resistant by design.
- The Agent ID contract has no Enumerable extension (verified on-chain, 2026-11-21); its tokenId is `uint256(keccak256(name))`. The frontend derives the tokenId from the user's own `.ai` name; the contract verifies ownership.

## Contracts
| Contract | Purpose |
|---|---|
| `src/AgentShieldRegistry.sol` | The registry. Two writes: `setPolicy(flags, maxTxValueWei, agentTokenId)` and `checkIn()`. Reads for any dApp: `isRegistered`, `getPolicy`, `isActive`, `shieldScore`, `badgeTier`. |
| `src/mocks/MockAgentID.sol` | Test/testnet mock only. Not for production. |

**Shield Score (0–100):** 40 registered · up to 30 policy completeness (10 per rule) · up to 30 activity (15 for a check-in within 7 days + up to 15 for a live streak).
**Badge tiers (derived, no claim, no NFT):** 1 Member · 2 Bronze (streak 3) · 3 Silver (streak 5) · 4 Gold (streak 7). A dead streak falls back to Member.

## Safety properties & owner permissions (disclosed as required)
- The registry **holds no user funds**: there is no payable, deposit, transfer, or withdraw function, and it rejects plain BNB transfers (covered by a test).
- It **never requests token approvals**. Every user action is a value-0 transaction the user confirms in their own wallet.
- **Owner permissions:** the contract owner can only `pauseRegistrations()` / `unpauseRegistrations()` (pausing blocks *new* registrations; existing users can still update policies and check in) and transfer ownership. The owner **cannot** change any user's policy, streak, or score, and cannot move funds (there are none).
- The website connects only via the Binance Wallet in-app dApp browser or standard WalletConnect/injected wallets. There is **no** QR-code / pairing-code Agentic Wallet login, no server-side session storage (the site is static, with no backend), and no collection of seed phrases, private keys, or pairing codes.

## Develop
Requires [Foundry](https://book.getfoundry.sh/).

```bash
forge build
forge test          # 21 tests
```

Deploy scripts (broadcasting requires the operator's own key at run time — never commit keys):
- BSC testnet (deploys the mock + registry): `script/DeployTestnet.s.sol`
- BSC mainnet (registry wired to the real Agent ID contract): `script/DeployMainnet.s.sol`

## Frontend
Static Vite + React + wagmi/viem site in `web/` — three pages (Home & Registration with a mandatory transaction preview before signing, My Dashboard, Developers). Testnet mode is fully wired to the deployed contracts below, including a Mock Agent ID mint for testing; mainnet mode shows the real Agent ID contract and unlocks when the mainnet registry is deployed. See `web/README.md`.

## Status
Spec v2.1 · D0 verification complete · contracts compile, 21/21 tests pass · **deployed on BSC testnet** (MockAgentID `0x00dC11c02780d8309aBc807a06828D3d0dB08268`, registry `0x98E48DAFdce825B7835939A59035e0C81aE7b7D9`; on-chain smoke test passed, Shield Score 88) · frontend builds and previews cleanly · mainnet deploy planned 2026-11-29.

## License
MIT
