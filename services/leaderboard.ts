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
    Object.values(pnlDump["User"]).map((userKey, index) => {
      const closedPnl = pnlDump["Closed_pnl"][index];
      let openPnl = 0;
      if (pnlDump["Current_pos"][index] == 0) {
        openPnl = 0;
      } else if (pnlDump["Current_pos"][index] < 0) {
        openPnl =
          (pnlDump["Avg_current_price"][index] - poolPrice) *
          Math.abs(pnlDump["Current_pos"][index]);
      } else if (pnlDump["Current_pos"][index] > 0) {
        openPnl =
          (poolPrice - pnlDump["Avg_current_price"][index]) *
          Math.abs(pnlDump["Current_pos"][index]);
      }
      const totalPnl = closedPnl + openPnl;
      leaderboard.push({
        userKey: userKey,
        totalPnl: totalPnl,
        currentPos: pnlDump["Current_pos"][index]
      });
    });
    writeFile(`./_leaderboard/${contractState.name}.json`, JSON.stringify(leaderboard), function (err) {
        if (err) throw err;
      });
  } catch (e) {
    console.log(e);
  }
}
