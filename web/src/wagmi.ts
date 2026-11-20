import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Connection rules (hackathon red lines): standard injected / WalletConnect
// only — the Binance Wallet in-app dApp browser appears as an injected
// provider. There is NO QR pairing-code Agentic Wallet login flow here, and
// no backend that could store a session.
const wcProjectId = import.meta.env.VITE_WC_PROJECT_ID as string | undefined;

export const wagmiConfig = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    injected(),
    ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
  ],
  transports: {
    [bscTestnet.id]: http("https://bsc-testnet-rpc.publicnode.com"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
  },
});
