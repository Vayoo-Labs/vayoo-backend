import { AnchorProvider, Idl, Program, Wallet } from "@project-serum/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token-v2";
import { Connection, PublicKey } from "@solana/web3.js";
import { VAYOO_CONTRACT_ID } from "./constants";
import { IDL } from "./vayoo-contracts"
import { getConnection, getWallet } from "./web3-utils";


export async function getVayooProgramInstance() {
    const connection = getConnection();
    const wallet = getWallet();
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
    const programId = VAYOO_CONTRACT_ID;
    const program = new Program(IDL, programId, provider);

    return program;
}

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export const toUiAmount = (inputNumber: number | string, numDecimals: number) => {
    return Number(inputNumber) / (10 ** numDecimals)
};

export const addZeros = (inputNumber: number, numDecimals: number) => {
    if (numDecimals >= 100) throw new Error('Must be < 100 decimal places');
    return inputNumber * 10 ** numDecimals;
};

/**
*
* @param connection
* @param owner
*/
export async function getAtaTokenBalanceByOwner(connection: Connection, owner: PublicKey | string, mint: PublicKey | string) {
    const ataKey = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), true)
    try {
        return parseInt((await connection.getTokenAccountBalance(ataKey)).value.amount);
    } catch (e) {
        return 0;
    }
}

/**
 *
 * @param seeds
 * @param programId
 */
async function pda(seeds: Array<Buffer | Uint8Array>, programId: PublicKey) {
    return (await PublicKey.findProgramAddress(seeds, programId))[0];
}

/**
 *
 * @param seconds
 */
export const sleep = (seconds: number) => new Promise((res) => setTimeout(res, seconds * 1e3));