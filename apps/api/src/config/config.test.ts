import { describe, expect, it } from "vitest";
import { ConfigError, LOCAL_DATABASE_URL, loadConfig, redactDatabaseUrl } from "./config";

describe("loadConfig", () => {
  it("uses safe defaults for local development", () => {
    expect(loadConfig({})).toEqual({
      nodeEnv: "development",
      host: "0.0.0.0",
      port: 4000,
      databaseUrl: LOCAL_DATABASE_URL,
      logLevel: "info",
      corsOrigins: [],
      trustProxy: false,
      secureCookies: false,
      rateLimitPerMinute: 600,
      shutdownTimeoutMs: 10_000,
      migrationsDir: "./drizzle",
    });
  });

  it("reads every setting from the environment", () => {
    const config = loadConfig({
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: "8080",
      DATABASE_URL: "postgresql://u:p@db:5432/app",
      LOG_LEVEL: "warn",
      CORS_ORIGINS: "http://localhost:3000, https://example.com",
      TRUST_PROXY: "1",
      SECURE_COOKIES: "false",
      RATE_LIMIT_PER_MINUTE: "60",
      SHUTDOWN_TIMEOUT_MS: "5000",
      MIGRATIONS_DIR: "/app/drizzle",
    });
    expect(config).toMatchObject({
      nodeEnv: "production",
      host: "127.0.0.1",
      port: 8080,
      corsOrigins: ["http://localhost:3000", "https://example.com"],
      trustProxy: 1,
      secureCookies: false,
      rateLimitPerMinute: 60,
      shutdownTimeoutMs: 5000,
      migrationsDir: "/app/drizzle",
    });
  });

  it("sends cookies over HTTPS only in production, unless told otherwise", () => {
    expect(loadConfig({ NODE_ENV: "production", DATABASE_URL: "postgres://db/app" }).secureCookies).toBe(true);
    expect(loadConfig({ SECURE_COOKIES: "true" }).secureCookies).toBe(true);
    expect(() => loadConfig({ SECURE_COOKIES: "yes" })).toThrow("SECURE_COOKIES must be true or false");
  });

  it("requires DATABASE_URL in production instead of guessing", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("DATABASE_URL is required in production");
  });

  it("lists every problem at once", () => {
    try {
      loadConfig({ PORT: "eighty", LOG_LEVEL: "loud", TRUST_PROXY: "maybe", DATABASE_URL: "mysql://x" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect((error as ConfigError).problems).toHaveLength(4);
    }
  });
});

describe("redactDatabaseUrl", () => {
  it("hides the password", () => {
    expect(redactDatabaseUrl("postgres://sitters:secret@db:5432/sitters")).toBe("postgres://sitters:****@db:5432/sitters");
  });
});
