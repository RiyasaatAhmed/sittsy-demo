import { defineConfig } from "vitest/config";

// One test run for the whole repo: each workspace has its own vitest.config.mts.
export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
  },
});
