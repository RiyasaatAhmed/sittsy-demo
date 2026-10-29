// Entry point: reads the config, wires the real dependencies, listens, and
// shuts down gracefully on SIGTERM (docker stop) or SIGINT (Ctrl+C).

import { createApp } from "./app";
import { loadConfig, redactDatabaseUrl } from "./config/config";
import { createDb, createPool } from "./db/client";
import { createShutdown } from "./shared/lifecycle/shutdown";
import { createLogger } from "./logger/logger";
import { createSittersRepository } from "./modules/sitters/sitters.repository";

const config = loadConfig(process.env);
const logger = createLogger(config);

const pool = createPool(config.databaseUrl);
// An idle client can lose its connection (e.g. Postgres restarted). pg emits
// that on the pool; unhandled, it would crash the process. The next query
// reconnects, and a failing query becomes a 503.
pool.on("error", (error) => logger.warn({ err: error }, "idle database connection error"));

let shuttingDown = false;
const db = createDb(pool);
const app = createApp({
  config,
  logger,
  sitters: createSittersRepository(db),
  isShuttingDown: () => shuttingDown,
});

const server = app.listen(config.port, config.host, (error) => {
  if (error) {
    logger.fatal({ err: error }, "could not start the server");
    process.exit(1);
  }
  logger.info(
    { port: config.port, nodeEnv: config.nodeEnv, database: redactDatabaseUrl(config.databaseUrl) },
    "API listening",
  );
});

const shutdown = createShutdown({
  server,
  closeResources: () => pool.end(),
  logger,
  timeoutMs: config.shutdownTimeoutMs,
  onStart: () => {
    shuttingDown = true;
  },
});
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
