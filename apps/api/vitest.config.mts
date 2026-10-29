import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "api",
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Need a real Postgres: `npm run test:integration` (vitest.integration.config.mts).
    exclude: ["src/**/*.integration.test.ts"],
  },
});
