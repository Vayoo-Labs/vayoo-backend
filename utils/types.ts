export const OracleFeedType = {
    Pyth: 0,
    Switchboard: 1
  }

export type PriceFeedPoint = {
  contract_name: string,
  asset_price: number,
  oracle_price: number,
  time: string
}