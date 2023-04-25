import express, { Request, Response } from "express";
import { getAllContractInfo } from "../api/contracts";
import axios from "axios";
import { fetchAxiosWithRetry } from "../utils/web3-utils";

export const pnlRouter = express.Router();

pnlRouter.get(
  "/:contract_id/:user_name",
  async function (req: Request, res: Response) {
    try {
      const pnlDump = (
        await fetchAxiosWithRetry(
          `http://vps734305.ovh.net/vayoo/pnls_vayoo_${req.params.contract_id}.json`
        )
      ).data;
      const index = getIndexOfUser(req.params.user_name, pnlDump)!;
      if (index == undefined) {
        res.send(
          JSON.stringify({
            err: "User Not Found",
          })
        );
        return;
      }
      const userPnl = {
        userKey: pnlDump["User"][index],
        closedPnl: pnlDump["Closed_pnl"][index],
        currentPos: pnlDump["Current_pos"][index],
        avgCurrentPrice: pnlDump["Avg_current_price"][index],
      };
      res.send(JSON.stringify(userPnl));
    } catch (e) {
      res.send(
        JSON.stringify({
          err: e,
        })
      );
    }
  }
);

const getIndexOfUser = (userKey: string, pnlDump: any) => {
  let index;
  Object.values(pnlDump["User"]).map((userKeyItem, _index) => {
    if ((userKeyItem as string) == userKey) {
      index = _index;
      return;
    }
  });
  return index;
};