import { describe, expect, it } from "vitest";
import { addDays, daysBetween } from "@sitter/domain/calendar";
import { DEMO_AWAY_NIGHTS, DEMO_AWAY_STARTS_IN_DAYS, demoUnavailableSitter, generateUnavailability } from "./availability-data";
import { generateSitters } from "./seed-data";

const NOW = new Date("2026-10-29T09:00:00Z");
const TODAY = "2026-10-29";
const sitters = generateSitters(NOW).map((s, index) => ({ ...s, id: index + 1 }));

describe("generateUnavailability (fake fixtures)", () => {
  const rows = generateUnavailability(sitters, TODAY);

  it("is deterministic", () => {
    expect(generateUnavailability(sitters, TODAY)).toEqual(rows);
  });

  it("only blocks boarding sitters, with bounded future periods", () => {
    const boarding = new Set(sitters.filter((s) => s.prices.boarding !== undefined).map((s) => s.id));
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(boarding.has(row.sitterId)).toBe(true);
      expect(row.period.checkIn > TODAY).toBe(true);
      const nights = daysBetween(row.period.checkIn, row.period.checkOut);
      expect(nights).toBeGreaterThanOrEqual(3);
      expect(nights).toBeLessThanOrEqual(10);
    }
  });

  it("makes the best-rated nearby boarding sitter away for the documented demo week", () => {
    const demo = demoUnavailableSitter(sitters);
    expect(demo).toBeDefined();
    expect(rows.filter((row) => row.sitterId === demo?.id)).toEqual([
      {
        sitterId: demo?.id,
        period: { checkIn: addDays(TODAY, DEMO_AWAY_STARTS_IN_DAYS), checkOut: addDays(TODAY, DEMO_AWAY_STARTS_IN_DAYS + DEMO_AWAY_NIGHTS) },
        reason: "away (demo case)",
      },
    ]);
  });
});
