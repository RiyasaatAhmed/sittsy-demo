import { describe, expect, it } from "vitest";
import { SERVICES } from "@sitter/domain/sitter";
import { SERVICE_GROUPS } from "./labels";

describe("SERVICE_GROUPS", () => {
  it("lists every service exactly once", () => {
    const grouped = SERVICE_GROUPS.flatMap((group) => group.services);
    expect([...grouped].sort()).toEqual([...SERVICES].sort());
  });
});
