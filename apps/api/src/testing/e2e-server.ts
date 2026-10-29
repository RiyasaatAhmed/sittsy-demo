// Test-only host: exported web build + real API + newly seeded isolated Postgres.
import { fileURLToPath } from "node:url";
import express from "express";
import { pino } from "pino";
import { createApp } from "../app";
import { replaceAllSitters } from "../db/seed-database";
import { createBookingsRepository } from "../modules/bookings/bookings.repository";
import { createOwnersRepository } from "../modules/owners/owners.repository";
import { createSittersRepository } from "../modules/sitters/sitters.repository";
import { openTestDatabase } from "./integration-database";

if (!process.env.TEST_DATABASE_URL) throw new Error("E2E requires an explicit TEST_DATABASE_URL ending in _test");
const database = await openTestDatabase();
await replaceAllSitters(database.db, new Date());
const api = createApp({
  config: { corsOrigins: [], trustProxy: false, secureCookies: false, rateLimitPerMinute: 10000 },
  logger: pino({ level: "warn" }),
  sitters: createSittersRepository(database.db), owners: createOwnersRepository(database.db),
  bookings: createBookingsRepository(database.db),
  isShuttingDown: () => false,
});
const app = express();
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) api(req, res, next);
  else next();
});
const webRoot = fileURLToPath(new URL("../../../web/out", import.meta.url));
app.use(express.static(webRoot, { extensions: ["html"] }));
const server = app.listen(3100, "127.0.0.1", () => console.log("E2E ready at http://127.0.0.1:3100"));
const stop = () => server.close(() => { void database.close().then(() => process.exit(0)); });
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
