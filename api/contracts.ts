import dbpool from "../utils/db";

export const getAllContractInfo = async () => {
  const results = await dbpool.query(
    "SELECT * FROM CONTRACTS LEFT JOIN MARKETS ON CONTRACTS.market_name = MARKETS.market_name ORDER BY created_on DESC"
  );
  return results[0];
};

export const getAllContracts = async () => {
  const results = await dbpool.query("SELECT * FROM CONTRACTS");
  return results[0];
};

export const getContract = async (contractName: string) => {
  const results = await dbpool.query(
    `SELECT * FROM CONTRACTS WHERE name = '${contractName}'`
  );
  return results[0][0];
};
