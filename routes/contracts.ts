import express, { Request, Response } from 'express';
import { getAllContractsInfo } from '../api/contracts';

export const contractRouter = express.Router();

contractRouter.get('/', async function (req: Request, res: Response) {
    const allContractInfo = await getAllContractsInfo();
    res.send(JSON.stringify(allContractInfo));
});