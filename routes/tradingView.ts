import express, { Request, Response } from "express";
import { getContract } from "../api/contracts";
import dbpool from "../utils/db";
import { PriceFeedPoint } from "../utils/types";

export const tradingViewRouter = express.Router();

tradingViewRouter.get("/config", async function (req: Request, res: Response) {
  res.send(
    JSON.stringify({
      supported_resolutions: [
        "1",
        "3",
        "5",
        "15",
        "30",
        "60",
        "120",
        "180",
        "240",
      ],
      supports_group_request: false,
      supports_marks: false,
      supports_search: true,
      supports_timescale_marks: false,
    })
  );
});

tradingViewRouter.get("/symbols", async function (req: Request, res: Response) {
  const contract = await getContract(req.query.symbol as string);
  res.send(
    JSON.stringify({
      name: contract.market_name,
      ticker: req.query.symbol,
      description: contract.market_name,
      type: "Spot",
      session: "24x7",
      exchange: "Vayoo Markets",
      listed_exchange: "Vayoo Markets",
      timezone: "Etc/UTC",
      has_intraday: true,
      supported_resolutions: [
        "1",
        "3",
        "5",
        "15",
        "30",
        "60",
        "120",
        "180",
        "240",
        //   "1D",
      ],
      minmov: 1,
      pricescale: 1000,
    })
  );
});

tradingViewRouter.get("/history", async function (req: Request, res: Response) {
  let bar: any = {};
  const bars: any[] = [];
  const fromTime = new Date(0);
  let lastPricePointTime = fromTime;
  const toTime = new Date(Number(req.query.to) * 1000);
  const resolution = Number(req.query.resolution) * 60;
  const priceFeedData: any[] = (
    await dbpool.query(`
        SELECT * FROM PRICE_FEED WHERE contract_name = '${req.query.symbol}' ORDER BY time ASC`)
  )[0];
  priceFeedData.map((pricePoint: PriceFeedPoint) => {
    const pricePointTime = new Date(pricePoint.time);
    if (priceFeedData.at(-1) == pricePoint) {
      if (bar.lastPrice) {
        bar.close = bar.lastPrice;
        bars.push({
          open: bar.open,
          close: bar.close,
          high: bar.high,
          low: bar.low,
          time: bar.time,
        });
        return
      }
    }
    if (
      pricePointTime >
      new Date(lastPricePointTime.getTime() + resolution * 1000)
    ) {
      if (bar.lastPrice) {
        bar.close = bar.lastPrice;
        bars.push({
          open: bar.open,
          close: bar.close,
          high: bar.high,
          low: bar.low,
          time: bar.time,
        });
        bar.lastPrice = null;
        bar.open = bar.close;
      }
    }
    if (pricePointTime > lastPricePointTime && pricePointTime < toTime) {
      if (!bar.lastPrice) {
        // Only for new bars
        if (!bar.open) {
          // Only for first bar
          bar.open = pricePoint.asset_price;
        }
        bar.lastPrice = pricePoint.asset_price;
        bar.high = bar.lastPrice;
        bar.low = bar.lastPrice;
        bar.time = pricePointTime.getTime() / 1000;
        lastPricePointTime = pricePointTime;
      }
      // Update bar
      bar.lastPrice = pricePoint.asset_price;
      bar.high = Math.max(bar.lastPrice, bar.high);
      bar.low = Math.min(bar.lastPrice, bar.low);
    }
  });
  const slicedBars = bars.slice(-req.query.countback!);
  const t: number[] = [];
  const c: number[] = [];
  const o: number[] = [];
  const h: number[] = [];
  const l: number[] = [];

  slicedBars.map((bar: any) => {
    t.push(bar.time);
    c.push(bar.close);
    o.push(bar.open);
    h.push(bar.high);
    l.push(bar.low);
  });
  if (slicedBars.length == 0) {
    res.send(
      JSON.stringify({
        s: "no_data",
      })
    );
  } else {
    res.send(
      JSON.stringify({
        s: "ok",
        t,
        c,
        o,
        h,
        l,
      })
    );
  }
});
