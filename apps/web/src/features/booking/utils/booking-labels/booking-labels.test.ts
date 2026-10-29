import { describe, expect, it } from "vitest";
import { describeStay, formatCents, formatExpiry } from "./booking-labels";

describe("booking labels", () => {
  it("formats cents as euros, with decimals only when needed", () => {
    expect(formatCents(12600)).toBe("€126");
    expect(formatCents(12650)).toBe("€126.50");
    expect(formatCents(5)).toBe("€0.05");
  });

  it("describes a stay with its nights", () => {
    expect(describeStay({ checkIn: "2026-11-02", checkOut: "2026-11-05" }, 3)).toBe("November 2–5 · 3 nights");
    expect(describeStay({ checkIn: "2026-11-30", checkOut: "2026-12-01" }, 1)).toBe("November 30 – December 1 · 1 night");
  });

  it("shows the expiry in Paris time", () => {
    expect(formatExpiry("2026-10-30T10:00:00.000Z")).toBe("Oct 30, 11:00");
  });
});
