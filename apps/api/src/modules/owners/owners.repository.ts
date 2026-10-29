// Data access for demo owners: the only code that queries demo_owners.
import { eq } from "drizzle-orm";
import type { Db } from "../../db/client";
import { databaseQuery } from "../../db/database-query";
import { demoOwners } from "../../db/schema";

export type OwnersRepository = {
  /** The owner whose token hashes to `tokenHash`, or null. */
  findIdByTokenHash(tokenHash: string): Promise<number | null>;
  /** Creates an owner for a new token; returns its id. */
  create(tokenHash: string): Promise<number>;
};

export function createOwnersRepository(db: Db): OwnersRepository {
  return {
    findIdByTokenHash: (tokenHash) =>
      databaseQuery(async () => {
        const [row] = await db.select({ id: demoOwners.id }).from(demoOwners).where(eq(demoOwners.tokenHash, tokenHash));
        return row?.id ?? null;
      }),
    create: (tokenHash) =>
      databaseQuery(async () => {
        const [row] = await db.insert(demoOwners).values({ tokenHash }).returning({ id: demoOwners.id });
        if (!row) throw new Error("Insert returned no row");
        return row.id;
      }),
  };
}
