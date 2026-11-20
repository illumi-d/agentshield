import { bsc, bscTestnet, type Chain } from "wagmi/chains";

export type NetworkKey = "testnet" | "mainnet";

export interface NetworkConfig {
  key: NetworkKey;
  label: string;
  chain: Chain;
  /** AgentShieldRegistry address; null until deployed on that network. */
  registry: `0x${string}` | null;
  /** Agent ID contract: the MockAgentID on testnet, the real SPACE ID Agent ID on mainnet. */
  agentId: `0x${string}`;
  agentIdIsMock: boolean;
  explorer: string;
}

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  testnet: {
    key: "testnet",
    label: "BSC Testnet",
    chain: bscTestnet,
    registry: "0x98E48DAFdce825B7835939A59035e0C81aE7b7D9",
    agentId: "0x00dC11c02780d8309aBc807a06828D3d0dB08268",
    agentIdIsMock: true,
    explorer: "https://testnet.bscscan.com",
  },
  mainnet: {
    key: "mainnet",
    label: "BNB Chain (Mainnet)",
    chain: bsc,
    registry: null, // mainnet deploy planned 2026-11-29 — see project spec
    agentId: "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F",
    agentIdIsMock: false,
    explorer: "https://bscscan.com",
  },
};

export const FLAG_DEFS = [
  {
    bit: 1,
    title: "Selalu konfirmasi manual",
    desc: "Setiap aksi yang menyentuh aset wajib dikonfirmasi user sendiri di wallet-nya.",
  },
  {
    bit: 2,
    title: "Tanpa approval tak terbatas",
    desc: "Agent tidak pernah memberi approval token tanpa batas (uint256.max); selalu jumlah pasti.",
  },
  {
    bit: 4,
    title: "Simulasi sebelum tanda tangan",
    desc: "Setiap transaksi disimulasikan dulu; kalau simulasi gagal atau aneh, transaksi tidak dikirim.",
  },
] as const;

export const TIER_NAMES = ["—", "Member", "Bronze", "Silver", "Gold"] as const;
