import { afterEach, expect, it, vi } from "vitest";
import { randomUuid } from "./random-uuid";

afterEach(() => vi.unstubAllGlobals());

it("makes distinct UUID v4 IDs when randomUUID is unavailable on an HTTP origin", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const ids = Array.from({ length: 20 }, randomUuid);
  expect(new Set(ids).size).toBe(20);
  for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
