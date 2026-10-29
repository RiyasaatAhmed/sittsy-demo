import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build -w @sitter/web && npx tsx apps/api/src/testing/e2e-server.ts",
    url: "http://127.0.0.1:3100/health/ready",
    reuseExistingServer: false,
    timeout: 120000,
    env: { TEST_DATABASE_URL: process.env.E2E_DATABASE_URL ?? "postgres://sitters:sitters@localhost:5433/sitters_e2e_test" },
  },
});
