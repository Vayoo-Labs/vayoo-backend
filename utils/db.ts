import { createPool } from 'mysql2';
import dotenv from "dotenv";
dotenv.config()

export const dbpool = createPool({
    host: process.env.DBHOSTNAME,
    user: process.env.DBUSERNAME,
    password: process.env.DBPASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
  });
