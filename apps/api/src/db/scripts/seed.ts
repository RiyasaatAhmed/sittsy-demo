// `npm run db:seed`: waits for Postgres, applies migrations, then replaces all
// sitters with freshly generated FAKE data. Safe to run again at any time.

import { loadConfig, redactDatabaseUrl } from "../../config/config";
import { createDb, createPool } from "../client";
import { migrateDatabase, waitForDatabase } from "../prepare-database";
import { replaceAllSitters } from "../seed-database";

const config = loadConfig(process.env);
const pool = createPool(config.databaseUrl);

try {
  console.log(`Seeding ${redactDatabaseUrl(config.databaseUrl)}`);
  await waitForDatabase(pool);
  const db = createDb(pool);
  await migrateDatabase(db, config.migrationsDir);
  const result = await replaceAllSitters(db, new Date());
  console.log(
    `Inserted ${result.sitters} fake sitters, ${result.serviceOffers} service offers and ${result.awayPeriods} away periods.`,
  );
} catch (error) {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
