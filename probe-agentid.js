// D0-1 probe: Agent ID contract (SPACE ID) on BSC — read-only eth_calls only.
// Run: node probe-agentid.js
const { ethers } = require("ethers");

const CONTRACT = "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";
const IZZY = "0x8C9d96418f458Ed1B58FC186c58223BBC766E4a5"; // Agentic Wallet, holds monkeyy.ai
const RPCS = [
  "https://bsc-dataseed.binance.org/",
  "https://bsc-dataseed1.defibit.io/",
  "https://bsc-dataseed1.ninicoin.io/",
];

const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function tokenOfOwnerByIndex(address,uint256) view returns (uint256)",
  "function tokenByIndex(uint256) view returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function supportsInterface(bytes4) view returns (bool)",
];

async function tryCall(label, fn) {
  try {
    const v = await fn();
    console.log(`${label}: OK -> ${typeof v === "bigint" ? v.toString() : v}`);
    return v;
  } catch (e) {
    console.log(`${label}: REVERT/ERROR -> ${(e.shortMessage || e.message || "").slice(0, 120)}`);
    return undefined;
  }
}

(async () => {
  let provider;
  for (const url of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(url, 56);
      const n = await p.getBlockNumber();
      console.log(`RPC ${url} block=${n}`);
      provider = p;
      break;
    } catch (e) {
      console.log(`RPC ${url} failed`);
    }
  }
  if (!provider) throw new Error("no RPC reachable");

  const code = await provider.getCode(CONTRACT);
  console.log(`contract code size: ${(code.length - 2) / 2} bytes`);

  const c = new ethers.Contract(CONTRACT, ABI, provider);
  await tryCall("name()", () => c.name());
  await tryCall("symbol()", () => c.symbol());
  await tryCall("supportsInterface ERC165 (0x01ffc9a7)", () => c.supportsInterface("0x01ffc9a7"));
  await tryCall("supportsInterface ERC721 (0x80ac58cd)", () => c.supportsInterface("0x80ac58cd"));
  await tryCall("supportsInterface ERC721Metadata (0x5b5e139f)", () => c.supportsInterface("0x5b5e139f"));
  await tryCall("supportsInterface ERC721Enumerable (0x780e9d63)", () => c.supportsInterface("0x780e9d63"));
  await tryCall("totalSupply()", () => c.totalSupply());
  const bal = await tryCall(`balanceOf(izzy ${IZZY})`, () => c.balanceOf(IZZY));
  const tid = await tryCall("tokenOfOwnerByIndex(izzy,0)", () => c.tokenOfOwnerByIndex(IZZY, 0));
  const candidate = BigInt(ethers.keccak256(ethers.toUtf8Bytes("monkeyy")));
  console.log(`candidate tokenId uint256(keccak256("monkeyy")): ${candidate.toString()}`);
  if (tid !== undefined) console.log(`tokenId match candidate: ${tid === candidate}`);
  await tryCall("ownerOf(tokenOfOwnerByIndex result)", () => c.ownerOf(tid !== undefined ? tid : candidate));
  await tryCall("tokenURI(tokenId)", () => c.tokenURI(tid !== undefined ? tid : candidate));
  console.log(`balanceOf result (raw): ${bal !== undefined ? bal.toString() : "n/a"}`);
})();
