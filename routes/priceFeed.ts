import express, { Request, Response } from 'express';
import { readFile } from 'fs';
import { DATA_STORE_PATH } from '../utils/constants';

export const priceFeedRouter = express.Router();

priceFeedRouter.get('/:contract_name', async function (req: Request, res: Response) {
    readFile(`${DATA_STORE_PATH}/${req.params.contract_name.replace('/', '-')}.json`, "utf-8", function (err, data) {
        if (err) {
            if (err?.code == 'ENOENT') {
                data = JSON.stringify([]);
            } else {
                res.send(JSON.stringify('error'))
                throw err
            }
        }        
        res.send(data);
    })
  });