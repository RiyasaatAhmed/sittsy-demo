import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  it("joins the class names that are set", () => {
    expect(cx("a", false, "b", undefined, null, "")).toBe("a b");
    expect(cx()).toBe("");
  });
});
