// All settings come from environment variables (Twelve-Factor), read and
// validated once at start-up. A bad value stops the server with every problem
// listed, instead of failing later on the first request.

export type Config = {
  nodeEnv: "development" | "production" | "test";
  host: string;
  port: number;
  databaseUrl: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  /** Origins allowed to call the API from a browser. Empty: same origin only (behind nginx). */
  corsOrigins: string[];
  /** Express "trust proxy": how many proxies sit in front (1 = nginx in Docker), or false. */
  trustProxy: boolean | number;
  /** Send cookies over HTTPS only. Default: on in production; off for plain-http localhost. */
  secureCookies: boolean;
  /** Requests per minute per client IP on /api. */
  rateLimitPerMinute: number;
  /** How long a graceful shutdown may take before the process is stopped. */
  shutdownTimeoutMs: number;
  /** Folder with the SQL migrations. */
  migrationsDir: string;
};

/** Matches docker-compose.yml's Postgres published on localhost. Development only. */
export const LOCAL_DATABASE_URL = "postgres://sitters:sitters@localhost:5433/sitters";

const NODE_ENVS = ["development", "production", "test"] as const;
const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Invalid configuration:\n- ${problems.join("\n- ")}`);
    this.name = "ConfigError";
  }
}

type Env = Record<string, string | undefined>;

function oneOf<T extends string>(name: string, raw: string | undefined, allowed: readonly T[], fallback: T, problems: string[]): T {
  if (raw === undefined || raw === "") return fallback;
  if ((allowed as readonly string[]).includes(raw)) return raw as T;
  problems.push(`${name} must be one of ${allowed.join(", ")}`);
  return fallback;
}

function integer(name: string, raw: string | undefined, min: number, max: number, fallback: number, problems: string[]): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || value < min || value > max) {
    problems.push(`${name} must be a whole number between ${min} and ${max}`);
    return fallback;
  }
  return value;
}

function flag(name: string, raw: string | undefined, fallback: boolean, problems: string[]): boolean {
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true" || raw === "false") return raw === "true";
  problems.push(`${name} must be true or false`);
  return fallback;
}

function trustProxy(raw: string | undefined, problems: string[]): boolean | number {
  if (raw === undefined || raw === "" || raw === "false") return false;
  if (raw === "true") return true;
  if (/^\d+$/.test(raw)) return Number(raw);
  problems.push("TRUST_PROXY must be true, false or a number of proxy hops");
  return false;
}

/** Reads the configuration from `env` (normally `process.env`). Throws ConfigError on bad values. */
export function loadConfig(env: Env): Config {
  const problems: string[] = [];
  const nodeEnv = oneOf("NODE_ENV", env.NODE_ENV, NODE_ENVS, "development", problems);

  const databaseUrl = env.DATABASE_URL ?? (nodeEnv === "production" ? "" : LOCAL_DATABASE_URL);
  if (databaseUrl === "") problems.push("DATABASE_URL is required in production");
  else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) problems.push("DATABASE_URL must be a postgres:// URL");

  const config: Config = {
    nodeEnv,
    host: env.HOST || "0.0.0.0",
    port: integer("PORT", env.PORT, 1, 65535, 4000, problems),
    databaseUrl,
    logLevel: oneOf("LOG_LEVEL", env.LOG_LEVEL, LOG_LEVELS, "info", problems),
    corsOrigins: (env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    trustProxy: trustProxy(env.TRUST_PROXY, problems),
    secureCookies: flag("SECURE_COOKIES", env.SECURE_COOKIES, nodeEnv === "production", problems),
    rateLimitPerMinute: integer("RATE_LIMIT_PER_MINUTE", env.RATE_LIMIT_PER_MINUTE, 1, 100_000, 600, problems),
    shutdownTimeoutMs: integer("SHUTDOWN_TIMEOUT_MS", env.SHUTDOWN_TIMEOUT_MS, 100, 120_000, 10_000, problems),
    migrationsDir: env.MIGRATIONS_DIR || "./drizzle",
  };

  if (problems.length > 0) throw new ConfigError(problems);
  return config;
}

/** The database URL without its password, for logs. */
export function redactDatabaseUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ":****@");
}
