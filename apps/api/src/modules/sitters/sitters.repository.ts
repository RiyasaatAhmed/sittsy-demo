// Data access for sitters: the only code that queries the sitter tables.
import { eq, sql } from "drizzle-orm";
import type { Stay } from "@sitter/domain/booking";
import type { Service, Sitter } from "@sitter/domain/sitter";
import type { Db } from "../../db/client";
import { databaseQuery } from "../../db/database-query";
import { sitterServices, sitters } from "../../db/schema";
import { blockedSitterIds } from "../availability/blocked-sitters";

export type SittersRepository = {
  /** All sitters offering `service`, with that service's price only. */
  findOffering(service: Service): Promise<Sitter[]>;
  /** Which of `sitterIds` cannot take `stay` (away or booked on one of its nights) at `now`. */
  findUnavailable(stay: Stay, now: Date, sitterIds: readonly number[]): Promise<Set<number>>;
  /** Resolves when the database answers; used by the readiness check. */
  ping(): Promise<void>;
};

export function createSittersRepository(db: Db): SittersRepository {
  return {
    findOffering: (service) =>
      databaseQuery(async () => {
        const rows = await db
          .select({ sitter: sitters, priceEur: sitterServices.priceEur })
          .from(sitters)
          .innerJoin(sitterServices, eq(sitterServices.sitterId, sitters.id))
          .where(eq(sitterServices.service, service));
        return rows.map(({ sitter, priceEur }) => ({ ...sitter, prices: { [service]: priceEur } }));
      }),
    findUnavailable: (stay, now, sitterIds) => databaseQuery(() => blockedSitterIds(db, stay, now, sitterIds)),
    ping: () =>
      databaseQuery(async () => {
        await db.execute(sql`SELECT 1`);
      }),
  };
}
