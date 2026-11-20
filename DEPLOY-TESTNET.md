# AgentShield — Panduan Deploy BSC Testnet

Status: **SUDAH TER-DEPLOY DI BSC TESTNET (21 Nov 2026, ~02:00 WIB)** — lihat bagian "Hasil deploy" di bawah. Panduan persiapan asli dipertahankan setelahnya sebagai catatan proses.

## Hasil deploy (terverifikasi ulang via RPC terpisah)
- MockAgentID: `0x00dC11c02780d8309aBc807a06828D3d0dB08268` — tx `0x36e28fbf0262c4ae122c1481e90200810c22e0877095a25e7bf649ea08128b9a`
- AgentShieldRegistry: `0x98E48DAFdce825B7835939A59035e0C81aE7b7D9` — tx `0x3e257357ebfa9c16e17f3c1cb9abc28e1c229209242e2cb33960bcb9239fe3e8`
- Explorer: https://testnet.bscscan.com/address/0x98E48DAFdce825B7835939A59035e0C81aE7b7D9
- Smoke test on-chain di testnet: mint tx `0x4e2b80…294f2`, setPolicy tx `0x6225bb…2d0fa`, checkIn tx `0x402c45…0acc` → `totalRegistered 1`, `totalCheckIns 1`, Shield Score deployer **88**, badgeTier 1, isActive true.
- Biaya total (2 deploy + 3 smoke): ±0,000207 tBNB. Sisa deployer: ±0,00979 tBNB.

## Yang sudah terbukti (21 Nov 2026)
- Unit test: **21/21 lulus** (`forge test`).
- Deploy end-to-end di Anvil lokal: MockAgentID `0x5FbD…80aa3` + registry `0xe7f1…0512` ter-deploy, lalu smoke test on-chain (mint → `setPolicy` → `checkIn`) menghasilkan `isRegistered: true`, **Shield Score 88** (40 daftar + 30 kebijakan lengkap + 15 aktif + 3 streak hari-1 — persis rumus spec), badgeTier 1 (Member), `isActive: true`.
- Simulasi script yang sama terhadap RPC BSC testnet asli (chainId 97, tanpa broadcast): **sukses**. Estimasi terukur dari simulasi: total gas 1.543.887, biaya ≈ **0,00031 tBNB** — jauh di bawah sekali drip faucet.

## Deployer testnet (sekali pakai)
- Alamat: `0xEFB580d06D4F1a43cD25fe626C220022d9B9d867`
- Saldo saat panduan ini ditulis: **0 tBNB** → perlu diisi dulu.
- Kuncinya hanya ada di `~/workspace/agentshield/.env` (mode 600, gitignored, tidak pernah ditampilkan/di-commit). Wallet ini dibuat khusus testnet: **jangan pernah dipakai di mainnet, jangan pernah diisi aset asli.** Alamatnya publik — aman dibagikan ke faucet.
- Alternatif tanpa wallet ini: izzy men-deploy sendiri dari Rabby via Remix (impor `src/AgentShieldRegistry.sol` + `src/mocks/MockAgentID.sol`, deploy mock dulu, lalu registry dengan alamat mock) — hasil akhirnya sama.

## Langkah tersisa
1. **Isi tBNB ke alamat deployer** (bagian izzy, ±2 menit, cukup alamat — tanpa kunci apa pun):
   - Faucet resmi BNB Chain: https://testnet.bnbchain.org/faucet-smart — tempel alamat deployer di atas.
   - Jika faucet resmi menolak (kadang ada syarat tambahan), kabari Wasa — cari faucet alternatif, atau kirim tBNB dari saldo testnet milik izzy sendiri bila ada. Kebutuhan cuma ≈0,001 tBNB termasuk cadangan.
2. **Kabari Wasa: "deployer sudah diisi"** → Wasa menjalankan broadcast persis perintah ini (kunci dibaca dari `.env`, tidak ditampilkan):
   ```bash
   forge script script/DeployTestnet.s.sol --rpc-url bsc_testnet --broadcast --private-key $DEPLOYER_PRIVATE_KEY
   ```
3. **Verifikasi & smoke di testnet** (Wasa): catat alamat MockAgentID + registry dari hasil broadcast, jalankan `SmokeTestnet.s.sol` ke testnet, cek skor/badge, dan buka kedua kontrak di https://testnet.bscscan.com untuk memastikan transaksi tercatat. Verifikasi source code di BscScan testnet menyusul bila diminta (butuh API key BscScan — opsional untuk testnet).
4. Laporkan alamat final testnet ke izzy → lanjut uji frontend melawan kontrak testnet ini.

## Catatan keamanan
- Semua ini **testnet** (chainId 97). Script mainnet (`DeployMainnet.s.sol`) terpisah dan **tidak** dijalankan dari panduan ini; deploy mainnet butuh konfirmasi eksplisit baru, review alamat & argumen konstruktor, sesuai safety rails.
- Jangan pernah menempel private key wallet utama ke chat, file proyek, atau repo — untuk mainnet nanti deployer-nya adalah wallet izzy sendiri lewat signer miliknya.
