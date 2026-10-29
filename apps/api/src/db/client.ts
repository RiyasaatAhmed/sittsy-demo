import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

/** One connection pool per process; closed on shutdown. */
export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl, max: 10 });
}

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}

/** The handle inside `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Either: helpers that run inside or outside a transaction take this. */
export type Executor = Db | Tx;
