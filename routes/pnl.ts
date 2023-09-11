import express, { Request, Response } from "express";
import { fetchAxiosWithRetry } from "../utils/web3-utils";
import { readFile } from "fs";

export const pnlRouter = express.Router();

pnlRouter.get(
  "/leaderboard/:contract_name",
  async (req: Request, res: Response) => {
    try {
      readFile(
        `./_leaderboard/${req.params.contract_name}.json`,
        { encoding: "utf-8" },
        function (err, data) {
          if (err) {
            res.send(
              JSON.stringify({
                err: err,
              })
            );
            return
          }
          const leaderboardData = JSON.parse(data);
          const sortedLeaderboardData = leaderboardData.sort(comparePnlHelper);
          res.send(JSON.stringify(sortedLeaderboardData));
        }
      );
    } catch (e) {
      res.send(
        JSON.stringify({
          err: e,
        })
      );
    }
  }
);

pnlRouter.get(
  "/rank/:contract_name/:user_name",
  async function (req: Request, res: Response) {
    try {
      readFile(
        `./_leaderboard/${req.params.contract_name}.json`,
        { encoding: "utf-8" },
        function (err, data) {
          if (err) {
            res.send(
              JSON.stringify({
                err: err,
              })
            );
            return
          }
          const leaderboardData = JSON.parse(data);
          const index = getRankOfUser(req.params.user_name, leaderboardData)!;
          res.send(JSON.stringify(index + 1));
        }
      );
    } catch (e) {
      res.send(
        JSON.stringify({
          err: e,
        })
      );
    }
  }
);

pnlRouter.get(
  "/:contract_id/:user_name",
  async function (req: Request, res: Response) {
    try {
      const pnlDump = (
        await fetchAxiosWithRetry(
          `http://vps734305.ovh.net/vayoo/pnls_vayoo_${req.params.contract_id}.json`
        )
      ).data;
      const userPnlDump = pnlDump.find((userPnl: any) => {
        return userPnl["User"] == req.params.user_name
      });
      if (!userPnlDump) {
        res.send(
          JSON.stringify({
            err: "User Not Found",
          })
        );
        return;
      }
      const userPnl = {
        userKey:userPnlDump["User"],
        closedPnl: userPnlDump["Closed_pnl"],
        currentPos: userPnlDump["Current_pos"],
        avgCurrentPrice: userPnlDump["Avg_current_price"],
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

const getRankOfUser = (userKey: string, leaderboardData: any) => {
  let index;
  const sortedLeaderboardData: any[] = leaderboardData.sort(comparePnlHelper);
  sortedLeaderboardData.map((item: any, _index) => {
    if ((item["userKey"] == userKey)) {
      index = _index;
      return;
    }
  });
  return index;
}

const comparePnlHelper = (userAPnl: any, userBPnl: any) => {
  if (userAPnl["totalPnl"] >= userBPnl["totalPnl"]) {
    return -1;
  } else {
    return 1;
  }
};
