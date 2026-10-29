import { defineConfig } from "tsup";

// Bundles the API (and the shared @sitter/domain source it imports) into
// plain ESM JavaScript in dist/. npm dependencies stay external: the Docker
// image installs them with `npm ci --omit=dev`.
export default defineConfig({
  entry: {
    server: "src/server.ts",
    setup: "src/db/scripts/setup.ts",
    seed: "src/db/scripts/seed.ts",
  },
  format: "esm",
  platform: "node",
  target: "node24",
  noExternal: [/^@sitter\//],
  sourcemap: true,
  clean: true,
});
