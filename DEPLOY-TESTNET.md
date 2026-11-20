# AgentShield — Panduan Deploy BSC Testnet

Status persiapan: **SIAP BROADCAST, menunggu tBNB.** Semua langkah di bawah sudah dibuktikan kecuali broadcast ke testnet asli.

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
