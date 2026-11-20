// Validates ETHERSCAN_API_KEY from .env against the Etherscan V2 API.
// Prints only the API status — never the key itself.
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const m = env.match(/^ETHERSCAN_API_KEY=(.+)$/m);
if (!m) {
  console.log("ETHERSCAN_API_KEY not found in .env");
  process.exit(1);
}
const key = m[1].trim();

(async () => {
  for (const chainid of [97, 56]) {
    const url = `https://api.etherscan.io/v2/api?chainid=${chainid}&module=stats&action=bnbprice&apikey=${key}`;
    const res = await fetch(url);
    const j = await res.json();
    console.log(`chainid ${chainid}: status=${j.status} message=${j.message}` + (j.status === "1" ? ` bnbprice(usd)=${j.result?.ethusd ?? j.result?.bnbusd ?? "n/a"}` : ` result=${JSON.stringify(j.result).slice(0, 120)}`));
  }
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
