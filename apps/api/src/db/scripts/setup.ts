// One-shot database setup for Docker (the `db-setup` service): waits for
// Postgres, applies migrations, and seeds FAKE data only if there is none yet,
// so restarting the stack never wipes data. Exits 0 on success.

import { loadConfig, redactDatabaseUrl } from "../../config/config";
import { createDb, createPool } from "../client";
import { migrateDatabase, waitForDatabase } from "../prepare-database";
import { countSitters, replaceAllSitters, seedMissingUnavailability } from "../seed-database";

const config = loadConfig(process.env);
const pool = createPool(config.databaseUrl);

try {
  console.log(`Preparing ${redactDatabaseUrl(config.databaseUrl)}`);
  await waitForDatabase(pool);
  const db = createDb(pool);
  await migrateDatabase(db, config.migrationsDir);
  console.log("Migrations applied.");
  const existing = await countSitters(db);
  if (existing > 0) {
    const added = await seedMissingUnavailability(db, new Date());
    console.log(`Found ${existing} sitters, not re-seeding${added > 0 ? `; added ${added} away periods` : ""}.`);
  } else {
    const result = await replaceAllSitters(db, new Date());
    console.log(
      `Inserted ${result.sitters} fake sitters, ${result.serviceOffers} service offers and ${result.awayPeriods} away periods.`,
    );
  }
} catch (error) {
  console.error("Database setup failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
