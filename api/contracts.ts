import { getVayooProgramInstance } from "../utils";
import dbpool from "../utils/db";
import { getContractStatePDA } from "../utils/vayoo-pda";

export const getAllContractsInfo = async () => {
  const vayooProgram = await getVayooProgramInstance();
  return await Promise.all(
    (
      await getAllContracts()
    ).map(async (contractInfo: any) => {
      const contractStateKey = getContractStatePDA(contractInfo.name).pda;
      return {
        ...contractInfo,
        publicKey: contractStateKey,
        account: await vayooProgram.account.contractState.fetch(
          contractStateKey
        ),
      };
    })
  );
};

export const getAllContracts = async () => {
  const results = await dbpool.query(
    "SELECT * FROM CONTRACTS LEFT JOIN MARKETS ON CONTRACTS.market_name = MARKETS.market_name ORDER BY created_on DESC"
  );
  return results[0];
};

export const getContract = async (contractName: string) => {
  const results = await dbpool.query(
    `SELECT * FROM CONTRACTS WHERE name = '${contractName}'`
  );
  return results[0][0];
};
