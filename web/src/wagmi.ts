import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Connection rules (hackathon red lines): standard injected / WalletConnect
// only. There is NO QR pairing-code Agentic Wallet login flow here, and
// no backend that could store a session.
//
// D0-2 finding (verified 21 Nov 2026 on the owner's phone): the Binance
// app's in-app dApp browser injects the Binance *Web3 Wallet* provider at
// window.binancew3w.ethereum — it does NOT expose the Agentic Wallet to
// third-party dApps. We therefore offer that provider as an explicit
// "Binance Wallet" connector (it connects the Web3 Wallet), while Agentic
// Wallet holders use the agent path documented on the site.
const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID as string | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const binanceProvider = typeof window !== "undefined" ? (window as any).binancew3w?.ethereum : undefined;

export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    injected(),
    ...(binanceProvider
      ? [
          injected({
            target: () => ({ id: "binance-w3w", name: "Binance Wallet", provider: binanceProvider }),
          }),
        ]
      : []),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
  ],
  transports: {
    [bscTestnet.id]: http("https://bsc-testnet-rpc.publicnode.com"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
  },
});
