import { buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PriceMath, WhirlpoolClient, WhirlpoolContext } from "@orca-so/whirlpools-sdk";
import { IdlAccounts } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getVayooProgramInstance } from "../utils";
import { CONTRACT_NAME, DATA_STORE_PATH, PYTHFEED_KEY, WHIRLPOOL_KEYS } from "../utils/constants";
import { VayooContracts } from "../utils/vayoo-contracts";
import { getContractStatePDA } from "../utils/vayoo-pda";
import { getConnection, getWallet } from "../utils/web3-utils";
import { existsSync, mkdirSync, readFile, writeFile } from "fs";
import { parsePriceData } from "@pythnetwork/client";

export async function storePriceDataService() {
    const vayooProgram = await getVayooProgramInstance();
    const wallet = getWallet();
    const contractStateKey = getContractStatePDA(CONTRACT_NAME).pda;
    const contractState = await vayooProgram.account.contractState.fetch(contractStateKey)
    const whirlpoolClient = buildWhirlpoolClient(WhirlpoolContext.from(vayooProgram.provider.connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID));

    if (!existsSync(DATA_STORE_PATH)) {
        mkdirSync(DATA_STORE_PATH);
    }

    setInterval(
        () => Promise.all(WHIRLPOOL_KEYS.map((whirlpoolKey) => {
            storeVayooPriceData(vayooProgram.provider.connection, new PublicKey(whirlpoolKey), whirlpoolClient, contractState)
    })), 1000);
}

async function storeVayooPriceData(connection: Connection, whirlpoolKey: PublicKey, whirlpoolClient: WhirlpoolClient, contractState: IdlAccounts<VayooContracts>['contractState']) {
    const pythAccount = (await connection.getAccountInfo(new PublicKey(PYTHFEED_KEY)))?.data!;
    const parsedPythData = parsePriceData(pythAccount);
    const pythPrice = parsedPythData.price ?? parsedPythData.previousPrice;
    const whirlpool = await whirlpoolClient.getPool(whirlpoolKey, true);
    const whirlpoolState = whirlpool.getData()
    const poolPrice = PriceMath.sqrtPriceX64ToPrice(whirlpoolState?.sqrtPrice!, 6, 6);
    const assetPrice = poolPrice.toNumber() + (contractState?.startingPrice.toNumber()! / contractState.pythPriceMultiplier) - (contractState?.limitingAmplitude.toNumber()! / 2);
    const timeNow = Math.trunc(Date.now() / 1000);
    readFile(`${DATA_STORE_PATH}/${contractState.name.replace('/', '-')}.json`, "utf-8", function (err, data) {
        if (err) {
            if (err?.code == 'ENOENT') {
                data = JSON.stringify([]);
            } else {
                throw err
            }
        }

        let jsonData = JSON.parse(data)
        jsonData.push({
            timestamp: timeNow,
            assetPrice: assetPrice,
            pythPrice: pythPrice
        });
        // jsonData.
        writeFile(`${DATA_STORE_PATH}/${contractState.name.replace('/', '-')}.json`, JSON.stringify(jsonData), { flag: '' }, function (err) {
            if (err) throw err;
        });
    })
    return
}