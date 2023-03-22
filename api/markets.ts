import { dbpool } from "../utils/db"

export const getAllMarkets = async () => {
    const results = await dbpool.promise().query('SELECT * FROM MARKETS');
    return results[0];
}
