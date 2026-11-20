// Generates a THROWAWAY deployer wallet for BSC TESTNET ONLY and writes its
// key to ./.env (mode 600, gitignored). Prints ONLY the public address.
// This wallet must never hold mainnet assets and never be used on mainnet.
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const existing = fs.readFileSync(envPath, "utf8");
  const m = existing.match(/DEPLOYER_ADDRESS=(0x[0-9a-fA-F]{40})/);
  console.log("Deployer already exists:", m ? m[1] : "(address not recorded)");
  process.exit(0);
}
const w = ethers.Wallet.createRandom();
const content =
  "# AgentShield BSC TESTNET throwaway deployer — TESTNET ONLY, never mainnet, never fund with real assets.\n" +
  `DEPLOYER_ADDRESS=${w.address}\n` +
  `DEPLOYER_PRIVATE_KEY=${w.privateKey}\n`;
fs.writeFileSync(envPath, content, { mode: 0o600 });
console.log("New testnet deployer address:", w.address);
console.log("Key written to .env (mode 600, gitignored). Key value intentionally not printed.");
