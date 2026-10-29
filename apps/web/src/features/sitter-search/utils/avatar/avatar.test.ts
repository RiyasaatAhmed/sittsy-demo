import { describe, expect, it } from "vitest";
import { avatarDataUri } from "./avatar";

describe("avatarDataUri", () => {
  it("returns an SVG data URI", () => {
    expect(avatarDataUri(1, "Camille W.")).toMatch(/^data:image\/svg\+xml/);
  });

  it("gives the same sitter the same face every time", () => {
    expect(avatarDataUri(7, "Léa B.")).toBe(avatarDataUri(7, "Léa B."));
  });

  it("gives different sitters different faces", () => {
    expect(avatarDataUri(1, "Camille W.")).not.toBe(avatarDataUri(2, "Camille W."));
  });
});
