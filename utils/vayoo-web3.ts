import { buildWhirlpoolClient, ORCA_WHIRLPOOLS_CONFIG, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, WhirlpoolContext } from "@orca-so/whirlpools-sdk";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token-v2";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { getVayooProgramInstance } from ".";
import { COLLATERAL_MINT, DUMMY_PYTH_KEY, DUMMY_SWITCHBOARD_KEY, TICK_SPACING, USDC_MINT } from "./constants";
import { getContractStatePDA, getEscrowVaultCollateralPDA, getFreeVaultCollateralPDA, getFreeVaultScontractPDA, getLcontractMintPDA, getLockedVaultCollateralPDA, getLockedVaultScontractPDA, getScontractMintPDA, getUserStatePDA } from "./vayoo-pda";
import { getWallet } from "./web3-utils";
import { OracleFeedType } from "./types";

export async function getVayooAccounts(contractName: string, userKey: PublicKey) {
    const vayooProgram = await getVayooProgramInstance();
    const wallet = getWallet();

    const contractStateKey = getContractStatePDA(contractName).pda;
    const contractState = await vayooProgram.account.contractState.fetch(contractStateKey);

    const whirlpoolKey = PDAUtil.getWhirlpool(ORCA_WHIRLPOOL_PROGRAM_ID, ORCA_WHIRLPOOLS_CONFIG, contractState.lcontractMint, contractState.collateralMint, TICK_SPACING);
    const whirlpoolClient = buildWhirlpoolClient(WhirlpoolContext.from(vayooProgram.provider.connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID));

    let pythFeed = new PublicKey(DUMMY_PYTH_KEY);
    let switchboardFeed = new PublicKey(DUMMY_SWITCHBOARD_KEY);

    try {
        const whirlpool = await whirlpoolClient.getPool(whirlpoolKey.publicKey, true);
        const whirlpoolState = whirlpool.getData();
        const whirlpoolOraclePda = PDAUtil.getOracle(ORCA_WHIRLPOOL_PROGRAM_ID, whirlpoolKey.publicKey).publicKey;

        const lcontractMint = getLcontractMintPDA(contractName).pda;
        const scontractMint = getScontractMintPDA(contractName).pda;
        const escrowVaultCollateral = getEscrowVaultCollateralPDA(contractName).pda;

        const userStateKey = getUserStatePDA(contractName, userKey).pda;
        const vaultFreeCollateralAta = getFreeVaultCollateralPDA(
            contractName,
            userKey
        ).pda;
        const vaultLockedCollateralAta = getLockedVaultCollateralPDA(
            contractName,
            userKey
        ).pda;
        const vaultFreeScontractAta = getFreeVaultScontractPDA(
            contractName,
            userKey
        ).pda;
        const vaultLockedScontractAta = getLockedVaultScontractPDA(
            contractName,
            userKey
        ).pda;
        const userCollateralAta = getAssociatedTokenAddressSync(
            COLLATERAL_MINT,
            userKey,
            true
        );
        const vaultLcontractAta = getAssociatedTokenAddressSync(
            lcontractMint,
            userStateKey,
            true
        );
        const mmLcontractAta = getAssociatedTokenAddressSync(
            lcontractMint,
            userKey,
            true
        );

        if (contractState.feedType == OracleFeedType.Pyth) {
            pythFeed = contractState.oracleFeedKey
        } else if (contractState.feedType == OracleFeedType.Switchboard) {
            switchboardFeed = contractState.oracleFeedKey
        }
        
        const accounts = {
            collateralMint: USDC_MINT,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            tokenProgram: TOKEN_PROGRAM_ID,
            lcontractMint,
            scontractMint,
            escrowVaultCollateral,
            vaultFreeCollateralAta,
            vaultLockedCollateralAta,
            vaultFreeScontractAta,
            vaultLockedScontractAta,
            userState: userStateKey,
            userAuthority: userKey,
            contractState: contractStateKey,
            userCollateralAta,
            mmLockedScontractAta: vaultLockedScontractAta,
            mmLcontractAta,
            mmCollateralWalletAta: userCollateralAta,
            vaultLcontractAta,
            pythFeed,
            switchboardFeed,
            whirlpoolProgram: ORCA_WHIRLPOOL_PROGRAM_ID,
            whirlpool: whirlpoolKey,
            tokenVaultA: whirlpoolState.tokenVaultA,
            tokenVaultB: whirlpoolState.tokenVaultB,
            oracle: whirlpoolOraclePda,
        };
        return accounts
    } catch (e) {
        console.log("Fetching accounts failed, error:", e);
        return null
    }
}