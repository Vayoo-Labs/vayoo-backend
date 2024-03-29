import {
  buildWhirlpoolClient,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PriceMath,
  WhirlpoolClient,
  WhirlpoolContext,
} from "@orca-so/whirlpools-sdk";
import { IdlAccounts } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { getVayooProgramInstance } from "../utils";
import { VayooContracts } from "../utils/vayoo-contracts";
import { getContractStatePDA } from "../utils/vayoo-pda";
import { getConnection, getWallet } from "../utils/web3-utils";
import { parsePriceData } from "@pythnetwork/client";
import { getAllContractsInfo } from "../api/contracts";
import { OracleFeedType } from "../utils/types";
import {
  AggregatorAccount,
  SwitchboardProgram,
} from "@switchboard-xyz/solana.js";
import dbpool from "../utils/db";

export async function storePriceDataService() {
  const vayooProgram = await getVayooProgramInstance();
  const connection = getConnection();
  const wallet = getWallet();
  const switchboardProgram = await SwitchboardProgram.load(
    "mainnet-beta",
    connection
  );
  const whirlpoolClient = buildWhirlpoolClient(
    WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID)
  );

  const allContractsInfo = await getAllContractsInfo();
  allContractsInfo.map((contract) => {
    if (!contract.account.isSettling) {
      setInterval(() => {
        storeVayooPriceData(
          vayooProgram.provider.connection,
          switchboardProgram,
          new PublicKey(contract.whirlpool_key),
          whirlpoolClient,
          contract.account,
          new PublicKey(contract.oracle_feed_key)
        );
      }, 2000);
    }
  });
  console.log("Store Price Data Service Initialized");
}

async function storeVayooPriceData(
  connection: Connection,
  switchboardProgram: SwitchboardProgram,
  whirlpoolKey: PublicKey,
  whirlpoolClient: WhirlpoolClient,
  contractState: IdlAccounts<VayooContracts>["contractState"],
  oracleFeedKey: PublicKey
) {
  try {
    let oraclePrice: number;
    let assetPrice: number;
    const whirlpool = await whirlpoolClient.getPool(whirlpoolKey, true);
    const whirlpoolState = whirlpool.getData();
    const poolPrice = PriceMath.sqrtPriceX64ToPrice(
      whirlpoolState?.sqrtPrice!,
      6,
      6
    );

    if (contractState.oracleFeedType == OracleFeedType.Pyth) {
      const pythAccount = (await connection.getAccountInfo(oracleFeedKey))
        ?.data!;
      const parsedPythData = parsePriceData(pythAccount);
      const pythPrice = parsedPythData.price ?? parsedPythData.previousPrice;
      oraclePrice = pythPrice;
      assetPrice =
        poolPrice.toNumber() +
        contractState?.startingPrice.toNumber()! /
          contractState.oraclePriceMultiplier.toNumber() -
        contractState?.limitingAmplitude.toNumber()! / 2;
    } else if (contractState.oracleFeedType == OracleFeedType.Switchboard) {
      const aggregatorAccount = new AggregatorAccount(
        switchboardProgram,
        oracleFeedKey
      );
      const switchboardPrice =
        (await aggregatorAccount.fetchLatestValue())!.toNumber();
      oraclePrice = switchboardPrice;
      assetPrice =
        poolPrice.toNumber() +
        contractState?.startingPrice.toNumber()! /
          contractState.oraclePriceMultiplier.toNumber() -
        contractState?.limitingAmplitude.toNumber()! /
          2 /
          contractState.oraclePriceMultiplier.toNumber();
    }
    await dbpool.query(`INSERT INTO PRICE_FEED(
            contract_name,
            asset_price,
            oracle_price,
            time
            ) 
            VALUES 
            (
            '${contractState.name}',
            ${assetPrice!.toFixed(10)},
            ${oraclePrice!.toFixed(10)},
            FROM_UNIXTIME(${Date.now()} / 1000)
        )`);
  } catch (e) {
    console.log(e);
  }
}
