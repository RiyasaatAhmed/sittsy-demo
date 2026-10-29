import { defineConfig } from "drizzle-kit";
import { loadConfig } from "./src/config/config";

const { databaseUrl, migrationsDir } = loadConfig(process.env);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: migrationsDir,
  dbCredentials: { url: databaseUrl },
});
