// Steps shared by the database scripts (seed.ts, setup.ts).

import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";
import type { Db } from "./client";

const MAX_ATTEMPTS = 30;

/** Postgres may still be starting (e.g. right after `docker compose up`): retry for ~30 s. */
export async function waitForDatabase(pool: Pool): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) throw error;
      console.log(`Waiting for Postgres (${attempt}/${MAX_ATTEMPTS})...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/** Applies the SQL migrations in `migrationsDir` that have not run yet. */
export async function migrateDatabase(db: Db, migrationsDir: string): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsDir });
}
