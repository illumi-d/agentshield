// Validates the explorer API key from .env against BscScan's native endpoints.
// Prints only API status — never the key itself.
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const m = env.match(/^ETHERSCAN_API_KEY=(.+)$/m);
if (!m) {
  console.log("key not found in .env");
  process.exit(1);
}
const key = m[1].trim();

(async () => {
  const hosts = [
    ["mainnet api.bscscan.com", "https://api.bscscan.com/api"],
    ["testnet api-testnet.bscscan.com", "https://api-testnet.bscscan.com/api"],
  ];
  for (const [label, base] of hosts) {
    const url = `${base}?module=stats&action=bnbprice&apikey=${key}`;
    try {
      const res = await fetch(url);
      const j = await res.json();
      console.log(`${label}: status=${j.status} message=${j.message}` + (j.status === "1" ? ` bnbprice(usd)=${j.result?.bnbusd}` : ` result=${JSON.stringify(j.result).slice(0, 140)}`));
    } catch (e) {
      console.log(`${label}: fetch error ${e.message}`);
    }
  }
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
