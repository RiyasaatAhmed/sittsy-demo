import { describe, expect, it } from "vitest";
import { parsePathId } from "./path-id";

describe("parsePathId", () => {
  it("reads a positive id", () => {
    expect(parsePathId("47")).toBe(47);
    expect(parsePathId("2147483647")).toBe(2_147_483_647);
  });

  it.each([undefined, "", "0", "07", "-1", "1.5", "4a", "2147483648", "99999999999"])("refuses %j", (raw) => {
    expect(parsePathId(raw)).toBeNull();
  });
});
