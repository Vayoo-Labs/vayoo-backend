import { PublicKey } from "@solana/web3.js";

export const RPC = process.env.RPC || "https://api.metaplex.solana.com/"
// export const RPC = "https://polished-tame-market.solana-mainnet.discover.quiknode.pro/5a05dcbb634a417d3276611d035ad7ac5fd178e6/";

export const VAYOO_CONTRACT_ID = new PublicKey('6ccnZSaDcMwKe1xwHbubs4q2GdPEr7hSK59A3GddJpte');
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
export const SUPER_USER_KEY = new PublicKey("4gNFEk4qvgxE6iM8ukfDUDaCT8itAeWXxURbnqNZXZXp");
export const COLLATERAL_MINT = USDC_MINT;

export const ADMIN_KEYS = ['CkvRjxTtotXBuYjBXVkcyDfd3qoEgeLnQecxFfPg1ZcN','4gNFEk4qvgxE6iM8ukfDUDaCT8itAeWXxURbnqNZXZXp'];

export const TICK_SPACING = 64;
export const DAY_IN_SECONDS = 86400;

export const DATA_STORE_PATH = "./_data"