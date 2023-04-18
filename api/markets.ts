import dbpool from "../utils/db"

export const getAllMarkets = async () => {
    const results = await dbpool.query('SELECT * FROM MARKETS');
    return results[0];
}
