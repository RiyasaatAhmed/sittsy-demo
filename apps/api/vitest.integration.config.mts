import { defineConfig } from "vitest/config";

// Integration tests against a real Postgres (see src/testing/integration-database.ts).
// Run with `npm run test:integration` while `docker compose up -d db` is running.
export default defineConfig({
  test: {
    name: "api-integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    // The files share one database: run them one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
