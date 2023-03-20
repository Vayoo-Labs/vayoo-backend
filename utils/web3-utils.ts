import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { Connection } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";

export const getConnection = () => {
    const endpointUrl = process.env.RPC_ENDPOINT || 'https://rpc.helius.xyz/?api-key=7df1283e-42ff-42dd-8a74-2ca2883178dd';
    const url = new URL(endpointUrl);
    const hostURL = url.href.replace(`${url.username}:${url.password}@`, "");
    const headers: any = {};
    if (url.username) {
      headers["Authorization"] =
        "Basic " +
        Buffer.from(`${url.username}:${url.password}`).toString("base64");
    }
    return new Connection(hostURL, {
        commitment: 'confirmed',
        httpHeaders: headers,
        wsEndpoint: url.href.replace('https', 'wss'),
      });
  };

export const getWallet = () => {
    const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || ""; //PASTE WALLET PRIVATE KEY
    const USER_PRIVATE_KEY = bs58.decode(WALLET_PRIVATE_KEY);
    const USER_KEYPAIR = anchor.web3.Keypair.fromSecretKey(USER_PRIVATE_KEY);
    const wallet = new anchor.Wallet(USER_KEYPAIR)
    return wallet
}