import express, { Request, Response } from 'express';
import { getAllContractInfo } from '../api/contracts';

export const contractRouter = express.Router();

contractRouter.get('/', async function (req: Request, res: Response) {
    const allContractInfo = await getAllContractInfo();
    res.send(JSON.stringify(allContractInfo));
});