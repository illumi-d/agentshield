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

## D0-2 HASIL UJI (21 Nov 2026, ~02:41 WIB, oleh izzy di HP-nya) — SELESAI
- Izzy membuka situs live (https://agentshield-three-blush.vercel.app) dari browser dApp di dalam aplikasi Binance, mode Mainnet, dan menghubungkan wallet.
- **Hasil: koneksi BERHASIL, tetapi alamat yang tersambung adalah Binance Web3 Wallet (keyless) izzy, 0x7B3167C0904417d1595362E679CeF19243eA1E0e — BUKAN Agentic Wallet (0x8C9d...E4a5) pemegang monkeyy.ai.** Situs dengan benar melaporkan "Agent ID tidak terdeteksi" untuk alamat tersebut.
- Kesimpulan: browser dApp Binance menyuntikkan provider Web3 Wallet (`window.binancew3w.ethereum` per dokumentasi developer Binance), dan Agentic Wallet tidak dapat dihubungkan ke dApp pihak ketiga lewat browser — ia beroperasi lewat agen (perintah + persetujuan di aplikasi). Ini konsisten dengan red line hackathon (login QR/pairing Agentic Wallet di situs pihak ketiga memang dilarang).
- **Konsekuensi desain (diterapkan 21 Nov):** jalur utama holder Agentic Wallet ke AgentShield adalah **jalur agen** — agen user memanggil `setPolicy` + `checkIn` langsung ke kontrak (dua fungsi sederhana, value-0, tanpa approval; setiap tx tetap dikonfirmasi user di aplikasi Binance). Situs menambahkan kartu "Daftar lewat agenmu" berisi prompt siap salin untuk agen, konektor eksplisit "Binance Wallet" (binancew3w) untuk kejelasan, dan halaman Developer mendokumentasikan jalur agen. Strategi rekrut 30 interaktor diarahkan ke prompt agen satu-salinan, bukan ke alur browser.
