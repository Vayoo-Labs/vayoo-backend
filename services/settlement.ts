import { getVayooProgramInstance } from "../utils";
import { PublicKey } from "@solana/web3.js";
import { getVayooAccounts } from "../utils/vayoo-web3";
import { DAY_IN_SECONDS } from "../utils/constants";
import { VayooContracts } from "../utils/vayoo-contracts";
import { Program } from "@project-serum/anchor";
import { getAllContractInfo } from "../api/contracts";
import { getContractStatePDA } from "../utils/vayoo-pda";

export async function settlementService() {
    const vayooProgram = await getVayooProgramInstance();
    const allContractsInfo = await Promise.all((await getAllContractInfo()).map(async (contractInfo: any) => {
        const contractStateKey = getContractStatePDA(contractInfo.name).pda;
        return {
            publicKey: contractStateKey,
            account: await vayooProgram.account.contractState.fetch(contractStateKey)
        }
    }))
    allContractsInfo.map((contract: any) => {
        const timeNow = Date.now() / 1000; // Current time in seconds
        const contractEndingTime: number = contract.account.endingTime.toNumber();
        const timeToMaturity = contractEndingTime - timeNow;
        console.log("Contract Name :%s, Maturity: %d", contract.account.name, timeToMaturity)
        if (!contract.account.isSettling && timeToMaturity > -DAY_IN_SECONDS) { // If timeToMaturity  < day_in_seconds, don't try to trigger
            setTimeout(async () => await triggerAndSettle(contract.publicKey), timeToMaturity * 1000)
        }
    })
    console.log('Settlement service Initialized')
}

async function triggerAndSettle(contractStateKey: PublicKey) {
    const vayooProgram = await getVayooProgramInstance();
    const contractState = await vayooProgram.account.contractState.fetch(contractStateKey);
    const vayooAccounts = await getVayooAccounts(contractState.name, vayooProgram.provider.publicKey!);
    if (!vayooAccounts) {
        console.log("Trigger Settlement Tx Failed");
        console.log("Triggering Settling contract Name : ", contractState.name)
        return
    }
    const txHash = await vayooProgram.methods.triggerSettleMode().accounts(vayooAccounts!).rpc().catch((e) => {
        console.log("Tx error: ", e)
    });
    const result = await vayooProgram.provider.connection.confirmTransaction(txHash!)
    if (!result.value.err) {
        console.log("Trigger Settlement Tx Success");
        console.log("Triggering Settling contract Name: ", contractState.name);
        console.log("Tx Hash:", txHash);

        const allUserStates = await vayooProgram.account.userState.all();

        Promise.all(allUserStates.filter((userState) => {
            return userState.account.contractAccount.equals(contractStateKey)
        }).map((userState) => {
            settleUser(contractState.name, userState.account.authority, vayooProgram)
        }))
    } else {
        console.log("Triggering Settlement Tx Failed");
        console.log("Triggering Settling contract Name: ", contractState.name);
        console.log("Tx Hash:", txHash);
    }

}

async function settleUser(contractName: string, userKey: PublicKey, vayooProgram: Program<VayooContracts>) {
    try {
        const vayooAccounts = await getVayooAccounts(contractName, userKey);
        vayooProgram.methods.adminSettle().accounts(vayooAccounts!).rpc().catch((e) => {
            console.log("Tx error: ", e)
        });
        const txHash = await vayooProgram.methods.adminSettle().accounts(vayooAccounts!).rpc().catch((e) => {
            console.log("Tx error: ", e)
        });
        const result = await vayooProgram.provider.connection.confirmTransaction(txHash!)

        if (!result.value.err) {
            console.log("Admin settle for user succesful :", userKey.toString());
            console.log("Tx Hash: ", txHash);
        } else {
            console.log("Admin settle Tx for user failed :", userKey.toString());
            console.log("Tx Hash: ", txHash);
        }
    } catch (e) {
        console.log("Admin settle for user fn failed :", userKey.toString());
        console.log("Error: ", e);
    }
}