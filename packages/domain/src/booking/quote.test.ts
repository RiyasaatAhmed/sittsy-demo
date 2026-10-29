import { describe, expect, it } from "vitest";
import { quoteStay } from "./quote";

describe("quoteStay", () => {
  it("itemises nights × nightly rate, in cents", () => {
    expect(quoteStay(42, { checkIn: "2026-11-02", checkOut: "2026-11-05" })).toEqual({
      currency: "EUR",
      nights: 3,
      lines: [{ label: "3 nights × €42", quantity: 3, unitAmountCents: 4200, amountCents: 12600 }],
      totalCents: 12600,
    });
  });

  it("uses the singular for one night", () => {
    expect(quoteStay(40, { checkIn: "2026-11-02", checkOut: "2026-11-03" }).lines[0]?.label).toBe("1 night × €40");
  });
});
