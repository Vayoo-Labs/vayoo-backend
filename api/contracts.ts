import { dbpool } from "../utils/db"

export const getAllContractInfo = async () => {
    const results = await dbpool.promise().query('SELECT * FROM CONTRACTS LEFT JOIN MARKETS ON CONTRACTS.market_name = MARKETS.market_name');
    return results[0];
}

export const getAllContracts = async () => {
    const results = await dbpool.promise().query('SELECT * FROM CONTRACTS');
    return results[0];
}
