import { describe, expect, it } from "vitest";
import { parseDecimal } from "./decimal";

describe("parseDecimal", () => {
  it("reads plain decimals, with surrounding spaces", () => {
    expect(parseDecimal("48.85")).toBe(48.85);
    expect(parseDecimal(" -2 ")).toBe(-2);
  });

  it.each([null, undefined, "", " ", "1e3", "abc", "2.35km", "Infinity", "1."])("rejects %j", (raw) => {
    expect(parseDecimal(raw)).toBeUndefined();
  });
});
