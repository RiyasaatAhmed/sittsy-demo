import { describe, expect, it } from "vitest";
import type { Db } from "../../db/client";
import { DatabaseUnavailableError } from "../../shared/http/errors";
import { createSittersRepository } from "./sitters.repository";

/** A Db whose every query fails the way pg does when Postgres is unreachable. */
const brokenDb = {
  select: () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:5433");
  },
  execute: async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:5433");
  },
} as unknown as Db; // Only the two methods the repository uses are needed here.

describe("sitters repository", () => {
  it("reports any query failure as DatabaseUnavailableError, keeping the cause", async () => {
    const repository = createSittersRepository(brokenDb);
    const error = await repository.findOffering("dog_walking").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    expect((error as Error).cause).toBeInstanceOf(Error);
    await expect(repository.ping()).rejects.toBeInstanceOf(DatabaseUnavailableError);
  });
});
