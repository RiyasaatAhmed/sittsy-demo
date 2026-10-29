import { vi } from "vitest";
import type { OwnersRepository } from "../modules/owners/owners.repository";

/** An in-memory owners table, so cookie sessions work end to end in route tests. */
export function fakeOwners() {
  const ids = new Map<string, number>();
  return {
    findIdByTokenHash: vi.fn<OwnersRepository["findIdByTokenHash"]>(async (tokenHash) => ids.get(tokenHash) ?? null),
    create: vi.fn<OwnersRepository["create"]>(async (tokenHash) => {
      const id = ids.size + 1;
      ids.set(tokenHash, id);
      return id;
    }),
  };
}
