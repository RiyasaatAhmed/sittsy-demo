import { pino, type Logger } from "pino";
import type { Config } from "../config/config";

/** JSON logs (one object per line) for log tooling. Never logs request bodies. */
export function createLogger(config: Pick<Config, "logLevel">): Logger {
  return pino({
    level: config.logLevel,
    // Keep secrets out of logs even if someone logs a header object.
    redact: ["req.headers.authorization", "req.headers.cookie"],
  });
}

export type { Logger };
