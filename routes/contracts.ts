import express, { Request, Response } from 'express';
import { readFile } from 'fs';
import { getAllContractInfo } from '../api/contracts';
import { DATA_STORE_PATH } from '../utils/constants';

export const contractRouter = express.Router();

contractRouter.get('/', async function (req: Request, res: Response) {
    const allContractInfo = await getAllContractInfo();
    res.send(JSON.stringify(allContractInfo));
});