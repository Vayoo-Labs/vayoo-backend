import express, { Express, Request, Response } from 'express';
import dotenv from "dotenv";
import cors from "cors"
import { settlementService } from './services/settlement';
import { storePriceDataService } from './services/storePriceData';
import { priceFeedRouter } from './routes/priceFeed';
import { contractRouter } from './routes/contracts';
dotenv.config()

const app: Express = express();
const port = process.env.PORT || 3000;

const allowedOrigins = JSON.parse(process.env.API_CORS_ALLOWED_ORIGINS as string);
const corsOptions = {
  origin: allowedOrigins,
};

app.use(cors(corsOptions));

app.get('/', (req: Request, res: Response) => {
  res.send('Vayoo Backend, you are not supposed to be here');
});

app.use('/priceFeed', priceFeedRouter);
app.use('/contracts', contractRouter);

app.listen(port, async () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  await settlementService()
  await storePriceDataService()
});

