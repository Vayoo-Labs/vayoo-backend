import { buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PriceMath, WhirlpoolClient, WhirlpoolContext } from "@orca-so/whirlpools-sdk";
import { IdlAccounts } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getVayooProgramInstance } from "../utils";
import { DATA_STORE_PATH } from "../utils/constants";
import { VayooContracts } from "../utils/vayoo-contracts";
import { getContractStatePDA } from "../utils/vayoo-pda";
import { getConnection, getWallet } from "../utils/web3-utils";
import { existsSync, mkdirSync, readFile, writeFile } from "fs";
import { parsePriceData } from "@pythnetwork/client";
import { getAllContractInfo } from "../api/contracts";
import { OracleFeedType } from "../utils/types";
import { AggregatorAccount, SwitchboardProgram } from "@switchboard-xyz/solana.js";

export async function storePriceDataService() {
    const vayooProgram = await getVayooProgramInstance();
    const connection = getConnection();
    const wallet = getWallet();
    const switchboardProgram = await SwitchboardProgram.load(
        "mainnet-beta",
        connection,
      );
    const whirlpoolClient = buildWhirlpoolClient(WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID));
    if (!existsSync(DATA_STORE_PATH)) {
        mkdirSync(DATA_STORE_PATH);
    }

    const allContractsInfo = await Promise.all((await getAllContractInfo()).map(async (contractInfo: any) => {
        const contractStateKey = getContractStatePDA(contractInfo.name).pda;
        return {
            ...contractInfo,
            publicKey: contractStateKey,
            account: await vayooProgram.account.contractState.fetch(contractStateKey)
        }
    }))
    allContractsInfo.map((contract) => {
        if(!contract.account.isSettling) {
            setInterval(
                () => { storeVayooPriceData(vayooProgram.provider.connection, switchboardProgram, new PublicKey(contract.whirlpool_key), whirlpoolClient, contract.account, new PublicKey(contract.oracle_feed_key)) }
                , 15000);
        }
    })
    console.log('Store Price Data Service Initialized');
}

async function storeVayooPriceData(connection: Connection, switchboardProgram: SwitchboardProgram, whirlpoolKey: PublicKey, whirlpoolClient: WhirlpoolClient, contractState: IdlAccounts<VayooContracts>['contractState'], oracleFeedKey: PublicKey) {
    try {
        let oraclePrice: number;
        if (contractState.feedType == OracleFeedType.Pyth) {
            const pythAccount = (await connection.getAccountInfo(oracleFeedKey))?.data!;
            const parsedPythData = parsePriceData(pythAccount);
            const pythPrice = parsedPythData.price ?? parsedPythData.previousPrice;
            oraclePrice = pythPrice
        } else if (contractState.feedType == OracleFeedType.Switchboard) {
            const aggregatorAccount = new AggregatorAccount(switchboardProgram, oracleFeedKey);
            const switchboardPrice = (await aggregatorAccount.fetchLatestValue())!.toNumber();
            oraclePrice = switchboardPrice;
        }
        const whirlpool = await whirlpoolClient.getPool(whirlpoolKey, true);
        const whirlpoolState = whirlpool.getData()
        const poolPrice = PriceMath.sqrtPriceX64ToPrice(whirlpoolState?.sqrtPrice!, 6, 6);
        const assetPrice = poolPrice.toNumber() + (contractState?.startingPrice.toNumber()! / contractState.oraclePriceMultiplier.toNumber()) - (contractState?.limitingAmplitude.toNumber()! / 2);
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
                assetPrice,
                oraclePrice
            });
            // jsonData.
            writeFile(`${DATA_STORE_PATH}/${contractState.name.replace('/', '-')}.json`, JSON.stringify(jsonData), { flag: '' }, function (err) {
                if (err) throw err;
            });
        })
    } catch (e) {
        console.log(e);
    }
}