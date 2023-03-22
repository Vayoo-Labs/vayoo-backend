import { dbpool } from "../utils/db"

export const getAllContractInfo = async () => {
    const results = await dbpool.promise().query('SELECT * FROM CONTRACTS CROSS JOIN MARKETS');
    return results[0];
}

export const getAllContracts = async () => {
    const results = await dbpool.promise().query('SELECT * FROM CONTRACTS');
    return results[0];
}
