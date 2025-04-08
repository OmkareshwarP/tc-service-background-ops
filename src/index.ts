import * as dotenv from 'dotenv';
import express, { Request, Response } from "express";
import { logError, initializeAbly, loadEnv, ablySubscribe, initializeSentry } from './utils/index.js';
import { initializeRedis } from './databases/redisUtil.js';
import path from 'path';
import { initializeCronJobs } from './utils/cronUtil.js';
import { initializeMongoDB } from './databases/mongoUtil.js';
import { initializeNeo4j } from './databases/neo4jUtil.js';
import { initializeAstraDB } from './databases/astraUtil.js';

dotenv.config({ path: path.resolve('.env') });

await loadEnv();

const PORT = process.env.PORT || 4000;

initializeSentry();
initializeRedis();
initializeMongoDB();
await initializeNeo4j();
await initializeAstraDB();
// await initializeCouchbase();
initializeAbly();
initializeCronJobs();

ablySubscribe();

//fake server
const app = express();

app.get("/health", (_: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/sentry-check", (req: Request, res: Response) => {
  const sentryError = new Error("Check Sentry error!");
  logError('Sentry error sent', 'sentryCheck', 1, sentryError, req.body);
  res.status(200).json({ status: "done" });
});

app.get("/", (_: Request, res: Response) => {
  res.status(200).json({ status: "🚀 Background worker is running..." });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fake server running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', 'unhandledRejection', 9, reason);
});

process.on('uncaughtException', (reason) => {
  logError('unhandledException', 'unhandledException', 9, reason);
});
