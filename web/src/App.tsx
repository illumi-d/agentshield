import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, keccak256, parseEther, stringToHex } from "viem";
import { FLAG_DEFS, NETWORKS, TIER_NAMES, type NetworkKey } from "./config";
import { AGENT_ID_ABI, REGISTRY_ABI } from "./abi";

// ── helpers ────────────────────────────────────────────────────────────────
const short = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—");
const fmtDate = (ts?: bigint) =>
  !ts || ts === 0n ? "—" : new Date(Number(ts) * 1000).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
/** Agent ID tokenId derivation, proven on-chain: uint256(keccak256(name)). */
const tokenIdOf = (name: string) => BigInt(keccak256(stringToHex(name.trim().toLowerCase())));

type Policy = {
  agentTokenId: bigint;
  flags: number;
  maxTxValueWei: bigint;
  registeredAt: bigint;
  lastCheckInAt: bigint;
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  exists: boolean;
};

function usePolicy(net: (typeof NETWORKS)[NetworkKey], address?: `0x${string}`) {
  const q = useReadContract({
    address: net.registry ?? undefined,
    abi: REGISTRY_ABI,
    functionName: "getPolicy",
    args: address ? [address] : undefined,
    chainId: net.chain.id,
    query: { enabled: !!net.registry && !!address },
  });
  const policy = (q.data as Policy | undefined) ?? undefined;
  return { ...q, policy };
}

function TxPreview(props: {
  net: (typeof NETWORKS)[NetworkKey];
  fnLabel: string;
  extra?: [string, string][];
}) {
  const { net } = props;
  return (
    <div className="preview">
      <strong>Pratinjau transaksi — baca sebelum menandatangani</strong>
      <table>
        <tbody>
          <tr><td>Jaringan</td><td>{net.label} (chainId {net.chain.id})</td></tr>
          <tr><td>Kontrak tujuan</td><td><span className="addr">{net.registry}</span></td></tr>
          <tr><td>Fungsi</td><td>{props.fnLabel}</td></tr>
          <tr><td>Nilai terkirim</td><td>0 BNB — transaksi ini tidak memindahkan dana</td></tr>
          <tr><td>Approval token</td><td>Tidak ada — situs ini tidak pernah meminta approve</td></tr>
          {props.extra?.map(([k, v]) => (
            <tr key={k}><td>{k}</td><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PolicyForm(props: {
  net: (typeof NETWORKS)[NetworkKey];
  tokenId: bigint;
  initialFlags?: number;
  initialMaxTx?: string;
  submitLabel: string;
  onDone: () => void;
}) {
  const { net, tokenId } = props;
  const [selected, setSelected] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (const f of FLAG_DEFS) init[f.bit] = ((props.initialFlags ?? 7) & f.bit) !== 0;
    return init;
  });
  const [maxTx, setMaxTx] = useState(props.initialMaxTx ?? "");
  const [reviewed, setReviewed] = useState(false);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const flags = FLAG_DEFS.reduce((acc, f) => acc + (selected[f.bit] ? f.bit : 0), 0);
  let maxWei = 0n;
  let maxValid = true;
  try {
    maxWei = maxTx.trim() === "" ? 0n : parseEther(maxTx.trim() as `${number}`);
  } catch {
    maxValid = false;
  }

  useEffect(() => {
    if (receipt.isSuccess) props.onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  return (
    <div>
      {FLAG_DEFS.map((f) => (
        <label className="check" key={f.bit}>
          <input
            type="checkbox"
            checked={!!selected[f.bit]}
            onChange={(e) => setSelected((s) => ({ ...s, [f.bit]: e.target.checked }))}
          />
          <span><strong>{f.title}</strong><br /><span className="muted small">{f.desc}</span></span>
        </label>
      ))}
      <p className="small muted" style={{ marginBottom: 4 }}>Batas nilai transaksi tanpa konfirmasi ekstra (BNB, opsional — kosongkan untuk 0):</p>
      <input type="text" inputMode="decimal" placeholder="cth. 0.1" value={maxTx} onChange={(e) => setMaxTx(e.target.value)} />
      {!maxValid && <p className="bad small">Format angka tidak valid.</p>}
      <TxPreview
        net={net}
        fnLabel="Daftarkan / perbarui kebijakan keamanan saya (setPolicy)"
        extra={[
          ["Agent ID tokenId", tokenId.toString()],
          ["Aturan aktif", `${flags} dari 7 (bitmask)`],
          ["Batas nilai", maxWei === 0n ? "0 / tidak diatur" : `${formatEther(maxWei)} BNB`],
        ]}
      />
      <label className="check">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        <span>Saya sudah membaca pratinjau di atas dan paham transaksi ini hanya mencatat kebijakan saya — tanpa memindahkan dana dan tanpa approval apa pun.</span>
      </label>
      <button
        className="primary"
        disabled={!reviewed || !maxValid || isPending || receipt.isLoading}
        onClick={() =>
          writeContract({
            address: net.registry!,
            abi: REGISTRY_ABI,
            functionName: "setPolicy",
            args: [flags, maxWei, tokenId],
            chainId: net.chain.id,
          })
        }
      >
        {isPending ? "Menunggu tanda tangan di wallet…" : receipt.isLoading ? "Menunggu konfirmasi jaringan…" : props.submitLabel}
      </button>
      {receipt.isSuccess && <p className="ok">Berhasil tercatat on-chain. Tx: <span className="addr">{hash}</span></p>}
      {error && <p className="bad small">Transaksi gagal/dibatalkan: {error.message.slice(0, 180)}</p>}
    </div>
  );
}

// ── pages ──────────────────────────────────────────────────────────────────
function HomePage(props: { net: (typeof NETWORKS)[NetworkKey]; goDashboard: () => void }) {
  const { net } = props;
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const [name, setName] = useState("");
  const tokenId = useMemo(() => (name.trim() ? tokenIdOf(name) : 0n), [name]);

  const statsReg = useReadContract({
    address: net.registry ?? undefined, abi: REGISTRY_ABI, functionName: "totalRegistered",
    chainId: net.chain.id, query: { enabled: !!net.registry },
  });
  const statsCi = useReadContract({
    address: net.registry ?? undefined, abi: REGISTRY_ABI, functionName: "totalCheckIns",
    chainId: net.chain.id, query: { enabled: !!net.registry },
  });
  const balance = useReadContract({
    address: net.agentId, abi: AGENT_ID_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined, chainId: net.chain.id,
    query: { enabled: !!address },
  });
  const { policy, refetch: refetchPolicy } = usePolicy(net, address);
  const mint = useWriteContract();
  const mintReceipt = useWaitForTransactionReceipt({ hash: mint.data });
  useEffect(() => {
    if (mintReceipt.isSuccess) balance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintReceipt.isSuccess]);

  const wrongChain = isConnected && chainId !== net.chain.id;
  const hasAgentId = (balance.data as bigint | undefined) !== undefined && (balance.data as bigint) > 0n;

  return (
    <>
      <section className="hero">
        <h1>Kebijakan keamanan agent-mu, tercatat on-chain dan terikat pada Agent ID-mu.</h1>
        <p>
          AgentShield adalah registri publik untuk pemilik Agent ID di BNB Chain: daftarkan aturan keamanan
          agent-mu, buktikan agent-mu aktif lewat check-in berkala, dan bangun Shield Score yang bisa dibaca
          dApp mana pun sebelum berinteraksi dengan agent-mu.
        </p>
      </section>

      <div className="stats">
        <div className="stat"><div className="num">{net.registry ? String(statsReg.data ?? "…") : "—"}</div><div className="muted">Agent terdaftar</div></div>
        <div className="stat"><div className="num">{net.registry ? String(statsCi.data ?? "…") : "—"}</div><div className="muted">Total check-in</div></div>
        <div className="stat"><div className="num">0</div><div className="muted">Dana user yang dipegang kontrak ini — memang dirancang begitu</div></div>
      </div>

      {!net.registry && (
        <div className="card"><h2>Mainnet belum rilis</h2>
          <p className="muted">Registry AgentShield di BNB Chain mainnet dijadwalkan deploy 29 November 2026. Untuk sekarang, gunakan mode <strong>BSC Testnet</strong> di atas — semua fitur sudah live di sana dengan Mock Agent ID.</p>
        </div>
      )}

      {net.registry && (
        <div className="card">
          <h2>Daftarkan Agent ID-mu</h2>
          {!isConnected && (
            <>
              <p className="muted">Hubungkan wallet yang memegang Agent ID-mu. Di aplikasi Binance Wallet, buka halaman ini dari browser dApp di dalam aplikasi; di browser biasa, gunakan wallet injected (MetaMask/Rabby/dll) atau WalletConnect. Situs ini <strong>tidak</strong> menyediakan login QR / kode pairing Agentic Wallet.</p>
              <div className="row">
                {connectors.map((c) => (
                  <button key={c.uid} className="primary" onClick={() => connect({ connector: c, chainId: net.chain.id })}>
                    Hubungkan — {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
          {isConnected && wrongChain && (
            <>
              <p className="warn">Wallet-mu terhubung ke jaringan lain (chainId {chainId}). Pindah ke {net.label} untuk melanjutkan.</p>
              <button className="primary" onClick={() => switchChain({ chainId: net.chain.id })}>Pindah ke {net.label}</button>
            </>
          )}
          {isConnected && !wrongChain && (
            <>
              <p className="small muted">Wallet: <span className="addr">{address}</span> · Kepemilikan Agent ID di jaringan ini:{" "}
                {balance.isLoading ? "memeriksa…" : hasAgentId ? <span className="ok">terdeteksi ✓</span> : <span className="bad">tidak terdeteksi</span>}
              </p>
              <p className="small" style={{ marginBottom: 4 }}>Nama Agent ID-mu (tanpa akhiran .ai) — tokenId diturunkan dari nama ini dan diverifikasi on-chain:</p>
              <input type="text" placeholder={net.agentIdIsMock ? "cth. namatesting" : "cth. monkeyy"} value={name} onChange={(e) => setName(e.target.value)} />
              {name.trim() && <p className="small muted">tokenId: <span className="addr">{tokenId.toString()}</span></p>}

              {!hasAgentId && net.agentIdIsMock && (
                <div className="preview">
                  <strong>Khusus testnet:</strong> wallet-mu belum punya Mock Agent ID. Mint satu untuk nama di atas
                  (gratis, hanya di testnet — nama bersifat siapa cepat dia dapat di kontrak mock).
                  <div style={{ marginTop: 10 }}>
                    <button disabled={!name.trim() || mint.isPending || mintReceipt.isLoading}
                      onClick={() => mint.writeContract({ address: net.agentId, abi: AGENT_ID_ABI, functionName: "mint", args: [address!, tokenId], chainId: net.chain.id })}>
                      {mint.isPending ? "Menunggu tanda tangan…" : "Mint Mock Agent ID (testnet)"}
                    </button>
                    {mintReceipt.isSuccess && <span className="ok"> — berhasil, kepemilikan sedang diperbarui…</span>}
                    {mint.error && <p className="bad small">{mint.error.message.slice(0, 160)}</p>}
                  </div>
                </div>
              )}
              {!hasAgentId && !net.agentIdIsMock && (
                <p className="bad">Wallet ini tidak memegang Agent ID di BNB Chain, jadi belum bisa mendaftar. Agent ID hanya bisa diklaim di dalam aplikasi Binance (Wallet → banner Agent ID).</p>
              )}
              {hasAgentId && policy?.exists && (
                <p className="ok">Wallet ini sudah terdaftar ✓ — ubah kebijakan atau check-in dari halaman Dashboard.</p>
              )}
              {hasAgentId && !policy?.exists && name.trim() && (
                <PolicyForm net={net} tokenId={tokenId} submitLabel="Tandatangani & daftarkan kebijakan saya"
                  onDone={() => { refetchPolicy(); statsReg.refetch(); props.goDashboard(); }} />
              )}
              {hasAgentId && !policy?.exists && !name.trim() && (
                <p className="muted small">Isi nama Agent ID-mu dulu untuk membuka formulir kebijakan.</p>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid2">
        <div className="card">
          <h3>Cara kerja</h3>
          <p className="muted">1. Daftarkan kebijakan — kontrak memverifikasi kamu pemilik Agent ID tersebut.<br />
          2. Check-in berkala (maksimal 1× per 20 jam) membuktikan agent-mu aktif dan masih dalam kendalimu; streak yang terjaga menaikkan tier badge-mu.<br />
          3. dApp lain membaca kebijakan, status aktif, dan Shield Score-mu langsung dari kontrak sebelum berinteraksi dengan agent-mu.</p>
        </div>
        <div className="card">
          <h3>Keamanan by design</h3>
          <p className="muted">Kontrak registry <strong>tidak menampung dana</strong> dan tidak punya fungsi transfer/withdraw. Situs ini tidak pernah meminta approval token, tidak mengumpulkan seed phrase / private key / kode pairing, dan setiap transaksi selalu kamu konfirmasi sendiri di wallet-mu. Izin owner kontrak hanya satu: menjeda pendaftaran baru — diungkap terbuka di halaman Developer.</p>
        </div>
      </div>
    </>
  );
}

function DashboardPage(props: { net: (typeof NETWORKS)[NetworkKey]; goHome: () => void }) {
  const { net } = props;
  const { address, isConnected } = useAccount();
  const { policy, refetch } = usePolicy(net, address);
  const score = useReadContract({
    address: net.registry ?? undefined, abi: REGISTRY_ABI, functionName: "shieldScore",
    args: address ? [address] : undefined, chainId: net.chain.id,
    query: { enabled: !!net.registry && !!address },
  });
  const tier = useReadContract({
    address: net.registry ?? undefined, abi: REGISTRY_ABI, functionName: "badgeTier",
    args: address ? [address] : undefined, chainId: net.chain.id,
    query: { enabled: !!net.registry && !!address },
  });
  const active = useReadContract({
    address: net.registry ?? undefined, abi: REGISTRY_ABI, functionName: "isActive",
    args: address ? [address] : undefined, chainId: net.chain.id,
    query: { enabled: !!net.registry && !!address },
  });
  const ci = useWriteContract();
  const ciReceipt = useWaitForTransactionReceipt({ hash: ci.data });
  const [ciReviewed, setCiReviewed] = useState(false);
  useEffect(() => {
    if (ciReceipt.isSuccess) { refetch(); score.refetch(); tier.refetch(); active.refetch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciReceipt.isSuccess]);

  if (!net.registry) return <div className="card"><h2>Mainnet belum rilis</h2><p className="muted">Gunakan mode BSC Testnet untuk melihat dashboard.</p></div>;
  if (!isConnected) return <div className="card"><h2>Hubungkan wallet dulu</h2><p className="muted">Dashboard menampilkan kebijakan untuk wallet yang terhubung. Kembali ke Beranda untuk menghubungkan wallet-mu.</p><button onClick={props.goHome}>Ke Beranda</button></div>;
  if (!policy) return <div className="card"><p className="muted">Memuat kebijakan…</p></div>;
  if (!policy.exists) return <div className="card"><h2>Belum terdaftar</h2><p className="muted">Wallet ini belum mendaftarkan kebijakan di AgentShield.</p><button className="primary" onClick={props.goHome}>Daftar di Beranda</button></div>;

  const nextCheckIn = policy.lastCheckInAt === 0n ? 0n : policy.lastCheckInAt + 20n * 3600n;
  const canCheckIn = nextCheckIn === 0n || BigInt(Math.floor(Date.now() / 1000)) >= nextCheckIn;

  return (
    <>
      <div className="grid2">
        <div className="card" style={{ textAlign: "center" }}>
          <div className="muted">Shield Score</div>
          <div className="score">{String(score.data ?? "…")}</div>
          <div className="muted">dari 100</div>
          <p style={{ marginBottom: 0 }}>
            <span className="badge">Badge: {TIER_NAMES[Number(tier.data ?? 0)]}</span>{" "}
            <span className="badge">{active.data ? "Aktif ✓" : "Tidak aktif"}</span>
          </p>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Statistik agent saya</h3>
          <table>
            <tbody>
              <tr><td className="muted">Streak saat ini</td><td><strong>{policy.currentStreak} hari</strong></td></tr>
              <tr><td className="muted">Streak terbaik</td><td>{policy.bestStreak} hari</td></tr>
              <tr><td className="muted">Total check-in</td><td>{policy.totalCheckIns}</td></tr>
              <tr><td className="muted">Terdaftar sejak</td><td>{fmtDate(policy.registeredAt)}</td></tr>
              <tr><td className="muted">Check-in terakhir</td><td>{fmtDate(policy.lastCheckInAt)}</td></tr>
              <tr><td className="muted">Check-in berikutnya</td><td>{canCheckIn ? <span className="ok">bisa sekarang</span> : fmtDate(nextCheckIn)}</td></tr>
            </tbody>
          </table>
          <div style={{ marginTop: 14 }}>
            <TxPreview net={net} fnLabel="Catat check-in keaktifan saya (checkIn)" />
            <label className="check">
              <input type="checkbox" checked={ciReviewed} onChange={(e) => setCiReviewed(e.target.checked)} />
              <span>Saya sudah membaca pratinjau di atas.</span>
            </label>
            <button className="primary" disabled={!canCheckIn || !ciReviewed || ci.isPending || ciReceipt.isLoading}
              onClick={() => ci.writeContract({ address: net.registry!, abi: REGISTRY_ABI, functionName: "checkIn", args: [], chainId: net.chain.id })}>
              {ci.isPending ? "Menunggu tanda tangan…" : ciReceipt.isLoading ? "Menunggu konfirmasi…" : canCheckIn ? "Check-in sekarang" : "Belum waktunya check-in"}
            </button>
            {ciReceipt.isSuccess && <p className="ok">Check-in tercatat ✓ Tx: <span className="addr">{ci.data}</span></p>}
            {ci.error && <p className="bad small">{ci.error.message.slice(0, 180)}</p>}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Kebijakan saya</h2>
        <p className="small muted">Agent ID tokenId: <span className="addr">{policy.agentTokenId.toString()}</span></p>
        {FLAG_DEFS.map((f) => (
          <p key={f.bit} style={{ margin: "6px 0" }}>
            {(policy.flags & f.bit) !== 0 ? <span className="ok">✓ Aktif</span> : <span className="bad">✗ Nonaktif</span>} — {f.title}
          </p>
        ))}
        <p className="small muted">Batas nilai tanpa konfirmasi ekstra: {policy.maxTxValueWei === 0n ? "0 / tidak diatur" : `${formatEther(policy.maxTxValueWei)} BNB`}</p>
        <h3>Perbarui kebijakan</h3>
        <PolicyForm
          net={net}
          tokenId={policy.agentTokenId}
          initialFlags={policy.flags}
          initialMaxTx={policy.maxTxValueWei === 0n ? "" : formatEther(policy.maxTxValueWei)}
          submitLabel="Tandatangani & perbarui kebijakan"
          onDone={() => { refetch(); score.refetch(); }}
        />
      </div>
    </>
  );
}

function DevelopersPage(props: { net: (typeof NETWORKS)[NetworkKey] }) {
  const { net } = props;
  const soliditySnippet = `// SPDX-License-Identifier: MIT
interface IAgentShieldRegistry {
    function isRegistered(address user) external view returns (bool);
    function isActive(address user) external view returns (bool);
    function shieldScore(address user) external view returns (uint256);
    function badgeTier(address user) external view returns (uint8);
    // getPolicy(user) returns the full policy struct:
    // agentTokenId, flags, maxTxValueWei, registeredAt, updatedAt,
    // lastCheckInAt, currentStreak, bestStreak, totalCheckIns, exists
}`;
  const tsSnippet = `import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";

const client = createPublicClient({ chain: bsc, transport: http() });

// Before interacting with an agent, check its safety posture:
const score = await client.readContract({
  address: REGISTRY_ADDRESS,
  abi: registryAbi,
  functionName: "shieldScore",
  args: [agentWalletAddress],
});`;
  return (
    <>
      <div className="card">
        <h2>Untuk developer</h2>
        <p className="muted">dApp mana pun bisa membaca postur keamanan sebuah agent sebelum berinteraksi dengannya — cukup dengan alamat wallet agent tersebut (bukan pencarian nama; AgentShield memang tidak menyediakan direktori nama→wallet).</p>
        <h3>Alamat kontrak — {net.label}</h3>
        <p className="small">Registry: {net.registry ? <a href={`${net.explorer}/address/${net.registry}`} target="_blank" rel="noreferrer"><span className="addr">{net.registry}</span></a> : <em>belum deploy di mainnet</em>}</p>
        <p className="small">Agent ID ({net.agentIdIsMock ? "mock, khusus testnet" : "SPACE ID Agent ID"}): <a href={`${net.explorer}/address/${net.agentId}`} target="_blank" rel="noreferrer"><span className="addr">{net.agentId}</span></a></p>
        <h3>Antarmuka baca (Solidity)</h3>
        <pre>{soliditySnippet}</pre>
        <h3>Contoh (TypeScript / viem)</h3>
        <pre>{tsSnippet}</pre>
      </div>
      <div className="card">
        <h2>Shield Score & izin owner — diungkap terbuka</h2>
        <p className="muted">
          Skor 0–100 dihitung on-chain: <strong>40</strong> terdaftar · hingga <strong>30</strong> kelengkapan kebijakan
          (10 per aturan aktif) · hingga <strong>30</strong> keaktifan (15 bila check-in ≤7 hari + hingga 15 dari streak
          yang masih hidup, 3 per hari, cap 5 hari). Tier badge diturunkan dari streak: Member (terdaftar),
          Bronze 3, Silver 5, Gold 7 — streak yang mati mengembalikan tier ke Member.
        </p>
        <p className="muted">
          <strong>Izin owner kontrak:</strong> owner hanya dapat menjeda/membatalkan jeda <em>pendaftaran baru</em> dan
          memindahkan kepemilikan kontrak. Owner tidak dapat mengubah kebijakan, streak, atau skor user mana pun,
          dan tidak dapat memindahkan dana — kontrak ini tidak menampung dana sama sekali, tidak memiliki fungsi
          payable/deposit/transfer/withdraw, dan menolak transfer BNB polos.
        </p>
      </div>
    </>
  );
}

// ── root ───────────────────────────────────────────────────────────────────
type Page = "home" | "dashboard" | "developers";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [networkKey, setNetworkKey] = useState<NetworkKey>("testnet");
  const net = NETWORKS[networkKey];
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <div className="wrap">
      <header className="top">
        <div className="logo">Agent<span>Shield</span></div>
        <div className="row">
          <button className={networkKey === "testnet" ? "active" : "ghost"} onClick={() => setNetworkKey("testnet")}>
            BSC Testnet
          </button>
          <button className={networkKey === "mainnet" ? "active" : "ghost"} onClick={() => setNetworkKey("mainnet")}>
            Mainnet
          </button>
          <span className={`badge ${net.key}`}>{net.key === "testnet" ? "MODE TESTNET" : "MAINNET"}</span>
          {isConnected && (
            <button className="ghost" onClick={() => disconnect()}>{short(address)} — Putuskan</button>
          )}
        </div>
      </header>
      <nav className="tabs">
        <button className={page === "home" ? "active" : ""} onClick={() => setPage("home")}>Beranda & Registrasi</button>
        <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>Dashboard Saya</button>
        <button className={page === "developers" ? "active" : ""} onClick={() => setPage("developers")}>Developer</button>
      </nav>

      {page === "home" && <HomePage net={net} goDashboard={() => setPage("dashboard")} />}
      {page === "dashboard" && <DashboardPage net={net} goHome={() => setPage("home")} />}
      {page === "developers" && <DevelopersPage net={net} />}

      <footer>
        AgentShield — dibangun untuk Agent ID Hackathon (Binance Wallet × BNB Chain). Kode kontrak open-source (MIT).
        Situs ini tidak menjanjikan keuntungan apa pun, tidak mengumpulkan seed phrase / private key / kode pairing,
        dan tidak menyediakan login QR Agentic Wallet. Setiap transaksi selalu kamu konfirmasi sendiri di wallet-mu.
        {net.key === "testnet" && <> Mode testnet memakai Mock Agent ID — bukan Agent ID asli.</>}
      </footer>
    </div>
  );
}
