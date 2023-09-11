import {
  ORCA_WHIRLPOOL_PROGRAM_ID,
  PriceMath,
  WhirlpoolClient,
  WhirlpoolContext,
  buildWhirlpoolClient,
} from "@orca-so/whirlpools-sdk";
import { getVayooProgramInstance } from "../utils";
import {
  fetchAxiosWithRetry,
  getConnection,
  getWallet,
} from "../utils/web3-utils";
import { getAllContractsInfo } from "../api/contracts";
import { PublicKey } from "@solana/web3.js";
import { IdlAccounts } from "@project-serum/anchor";
import { VayooContracts } from "../utils/vayoo-contracts";
import { writeFile } from "fs";

export async function storeAllLeaderboard() {
  const connection = getConnection();
  const wallet = getWallet();
  const whirlpoolClient = buildWhirlpoolClient(
    WhirlpoolContext.from(connection, wallet, ORCA_WHIRLPOOL_PROGRAM_ID)
  );
  const allContractsInfo = await getAllContractsInfo();
  allContractsInfo.map((contract) => {
    if (!contract.account.isSettling)
      setInterval(() => {
        storeContractLeaderboard(
          new PublicKey(contract.whirlpool_key),
          whirlpoolClient,
          contract.account
        );
      }, 5000);
  console.log("Leaderboard Service Initialized");
  });
}

async function storeContractLeaderboard(
  whirlpoolKey: PublicKey,
  whirlpoolClient: WhirlpoolClient,
  contractState: IdlAccounts<VayooContracts>["contractState"]
) {
  try {
    let leaderboard: any[] = [];
    const pnlDump = (
      await fetchAxiosWithRetry(
        `http://vps734305.ovh.net/vayoo/pnls_vayoo_${contractState.lcontractMint.toString()}.json`
      )
    ).data;
    const whirlpool = await whirlpoolClient.getPool(whirlpoolKey, true);
    const whirlpoolState = whirlpool.getData();
    const poolPrice = PriceMath.sqrtPriceX64ToPrice(
      whirlpoolState?.sqrtPrice!,
      6,
      6
    ).toNumber();
    Object.values(pnlDump).map((userPnl: any, index) => {
      const closedPnl = userPnl["Closed_pnl"];
      let openPnl = 0;
      if (userPnl["Current_pos"] == 0) {
        openPnl = 0;
      } else if (userPnl["Current_pos"] < 0) {
        openPnl =
          (userPnl["Avg_current_price"] - poolPrice) *
          Math.abs(userPnl["Current_pos"]);
      } else if (userPnl["Current_pos"] > 0) {
        openPnl =
          (poolPrice - userPnl["Avg_current_price"]) *
          Math.abs(userPnl["Current_pos"]);
      }
      const totalPnl = closedPnl + openPnl;
      leaderboard.push({
        userKey: userPnl["User"],
        totalPnl: totalPnl,
        currentPos: userPnl["Current_pos"]
      });
    });
    writeFile(`./_leaderboard/${contractState.name}.json`, JSON.stringify(leaderboard), function (err) {
        if (err) throw err;
      });
  } catch (e) {
    console.log(e);
  }
}
