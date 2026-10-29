import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, totalWeight } from "./weights";

describe("totalWeight", () => {
  it("adds every weight", () => {
    expect(totalWeight(DEFAULT_WEIGHTS)).toBeCloseTo(1.25, 10);
    expect(totalWeight({ ...DEFAULT_WEIGHTS, coldStart: 0 })).toBeCloseTo(1, 10);
  });
});
