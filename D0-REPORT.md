# AgentShield — Laporan Verifikasi D0
Tanggal: 21 Nov 2026 (~01:50 WIB) · Metode: eth_call read-only ke BSC mainnet (RPC publik Binance, block 134.746.083) via `probe-agentid.js` · **Tidak ada transaksi yang ditandatangani/dikirim.**

## D0-1: Kontrak Agent ID — SELESAI, terverifikasi on-chain
Kontrak: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (kode 8.756 byte, live)

| Pemeriksaan | Hasil |
|---|---|
| `name()` / `symbol()` | "SPACE ID Agent ID" / "AI" — cocok dengan pengumuman resmi |
| `supportsInterface` ERC-721 / Metadata / ERC-165 | true / true / true |
| `supportsInterface` ERC721Enumerable | **false** — `totalSupply()` dan `tokenOfOwnerByIndex()` revert |
| `balanceOf(0x8C9d…E4a5)` (Agentic Wallet izzy) | **1** — memegang Agent ID ✓ |
| `ownerOf(uint256(keccak256("monkeyy")))` | **0x8C9d…E4a5** ✓ — tokenId memang diturunkan dari nama: tokenId = `uint256(keccak256(nama))` = 33711122926440844008463557119520434235390147006564544156389722724774735230612 |
| `tokenURI(tokenId)` | `https://agentid.prd.space.id/metadata/monkeyy.json` → metadata: name "monkeyy", description "Binance Agent Id", URL gambar memuat tokenId yang sama ✓ |

### Konsekuensi desain (sudah dimasukkan ke spec v2.1)
- Karena **tidak ada Enumerable**, kontrak tidak bisa mencari tokenId dari alamat secara on-chain.
- Solusi yang lebih kuat dari fallback per-alamat: frontend menurunkan tokenId dari nama .ai milik user sendiri (keccak256 nama — terverifikasi di atas), lalu `setPolicy(flags, maxTxValueWei, agentTokenId)` dan kontrak **memverifikasi `ownerOf(agentTokenId) == msg.sender`** di kontrak Agent ID sebelum menerima registrasi. TokenId tersimpan di registrasi. Update kebijakan wajib memakai tokenId yang sama.
- Gerbang tambahan tetap `balanceOf(msg.sender) > 0`.

## D0-2: Alur koneksi holder Agent ID ke dApp — terdokumentasi, uji HP tertunda
- Yang terverifikasi dari pengumuman resmi: klaim Agent ID hanya di dalam aplikasi Binance (Wallet > banner Agent ID); red line hackathon melarang login QR/pairing Agentic Wallet di web pihak ketiga dan penyimpanan sesi di server.
- Alur yang akan dipakai AgentShield (sesuai spec): user membuka situs dari browser dApp di dalam aplikasi Binance Wallet (wallet yang memegang Agent ID-nya) atau WalletConnect/injected standar; setiap transaksi selalu dikonfirmasi user di wallet-nya.
- **Belum teruji dari sisi kami** (aplikasi Binance ada di HP izzy, tidak bisa diakses dari VM ini). Uji 2 menit yang perlu dilakukan izzy sebelum frontend selesai (target 22–24 Nov): buka halaman dApp tak berbahaya dari browser dalam aplikasi Binance Wallet, hubungkan wallet, pastikan alamat yang terbaca = Agentic Wallet pemegang monkeyy.ai, **tanpa menandatangani apa pun**. Hasilnya menentukan apakah WalletConnect perlu ditonjolkan atau cukup in-app browser.
