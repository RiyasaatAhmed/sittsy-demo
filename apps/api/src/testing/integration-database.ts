// A real Postgres for the integration tests: its own database (`sitters_test`
// by default, on the docker-compose server), created if missing, migrated
// with the real migrations, and emptied before each test. Data is FAKE.

import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import type { Stay } from "@sitter/domain/booking";
import { createDb, type Db } from "../db/client";
import { migrateDatabase } from "../db/prepare-database";
import { demoOwners, sitterServices, sitterUnavailability, sitters } from "../db/schema";
import { assertTestDatabaseUrl } from "./test-database-url";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://sitters:sitters@localhost:5433/sitters_test";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../drizzle", import.meta.url));

/** Creates the test database on the same server when it does not exist yet. */
async function ensureDatabaseExists(url: string): Promise<void> {
  const name = new URL(url).pathname.slice(1);
  if (!/^\w+$/.test(name)) throw new Error(`Unexpected test database name: ${name}`);
  const server = new URL(url);
  server.pathname = "/postgres";
  const admin = new Pool({ connectionString: server.toString(), max: 1 });
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    // The name is checked above: identifiers cannot be query parameters.
    if (rowCount === 0) await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }
}

export type TestDatabase = { db: Db; reset: () => Promise<void>; close: () => Promise<void> };

/**
 * Opens and migrates the test database. The pool has room for many
 * connections, so concurrent requests in a test really run in parallel.
 */
export async function openTestDatabase(): Promise<TestDatabase> {
  assertTestDatabaseUrl(TEST_DATABASE_URL);
  await ensureDatabaseExists(TEST_DATABASE_URL);
  const pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 20 });
  const db = createDb(pool);
  await migrateDatabase(db, MIGRATIONS_DIR);
  return {
    db,
    reset: async () => {
      await db.execute(
        sql`TRUNCATE bookings, demo_owners, sitter_unavailability, sitter_services, sitters RESTART IDENTITY CASCADE`,
      );
    },
    close: () => pool.end(),
  };
}

/** Inserts a fake sitter in central Paris offering boarding at `priceEur` a night; returns its id. */
export async function insertSitter(db: Db, priceEur = 42): Promise<number> {
  const [sitter] = await db
    .insert(sitters)
    .values({
      name: "Integration Sitter (fake)",
      lat: 48.8566,
      lng: 2.3522,
      ratingSum: 45,
      ratingCount: 10,
      medianResponseMinutes: 30,
      bookingsLast30d: 2,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      identityVerified: true,
    })
    .returning({ id: sitters.id });
  if (!sitter) throw new Error("No sitter inserted");
  await db.insert(sitterServices).values({ sitterId: sitter.id, service: "boarding", priceEur });
  return sitter.id;
}

/** Inserts a demo owner (any unique hash will do here); returns its id. */
export async function insertOwner(db: Db): Promise<number> {
  const [owner] = await db
    .insert(demoOwners)
    .values({ tokenHash: crypto.randomUUID() })
    .returning({ id: demoOwners.id });
  if (!owner) throw new Error("No owner inserted");
  return owner.id;
}

export async function insertAwayPeriod(db: Db, sitterId: number, period: Stay): Promise<void> {
  await db.insert(sitterUnavailability).values({ sitterId, period, reason: "away (test)" });
}
