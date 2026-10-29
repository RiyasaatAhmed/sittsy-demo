import { describe, expect, it } from "vitest";
import { parseBookingRequest, parseBookingTarget, parseSitterDecision } from "./booking-request";

const TODAY = "2026-10-29";
const valid = { sitterId: 47, service: "boarding", from: "2026-11-02", to: "2026-11-05", expectedTotalCents: 12600 };

describe("parseBookingTarget", () => {
  it("accepts a sitter id given as digits (from a URL)", () => {
    const parsed = parseBookingTarget({ sitterId: "47", service: "boarding", from: "2026-11-02", to: "2026-11-05" }, TODAY);
    expect(parsed).toEqual({
      ok: true,
      value: { sitterId: 47, service: "boarding", stay: { checkIn: "2026-11-02", checkOut: "2026-11-05" } },
    });
  });

  it("lists every problem at once", () => {
    const parsed = parseBookingTarget({ sitterId: undefined, service: undefined, from: null, to: null }, TODAY);
    expect(parsed).toEqual({
      ok: false,
      errors: [
        "sitterId is required",
        "service is required",
        "from must be a date (YYYY-MM-DD)",
        "to must be a date (YYYY-MM-DD)",
      ],
    });
  });

  it("refuses services that cannot be booked yet", () => {
    const parsed = parseBookingTarget({ sitterId: 1, service: "dog_walking", from: "2026-11-02", to: "2026-11-05" }, TODAY);
    expect(parsed).toEqual({ ok: false, errors: ["only boarding can be booked in this demo"] });
  });

  it.each([0, -3, 1.5, "4a7", 2_147_483_648, true])("refuses the sitter id %j", (sitterId) => {
    const parsed = parseBookingTarget({ sitterId, service: "boarding", from: "2026-11-02", to: "2026-11-05" }, TODAY);
    expect(parsed).toEqual({ ok: false, errors: ["sitterId must be a positive whole number"] });
  });

  it("refuses reversed dates", () => {
    const parsed = parseBookingTarget({ sitterId: 1, service: "boarding", from: "2026-11-05", to: "2026-11-02" }, TODAY);
    expect(parsed).toEqual({ ok: false, errors: ["to must be after from (at least one night)"] });
  });
});

describe("parseBookingRequest", () => {
  it("reads a valid body", () => {
    expect(parseBookingRequest(valid, TODAY)).toEqual({
      ok: true,
      value: {
        sitterId: 47,
        service: "boarding",
        stay: { checkIn: "2026-11-02", checkOut: "2026-11-05" },
        expectedTotalCents: 12600,
      },
    });
  });

  it.each([undefined, null, "text", [valid]])("refuses a body that is not an object: %j", (body) => {
    expect(parseBookingRequest(body, TODAY)).toEqual({ ok: false, errors: ["the body must be a JSON object"] });
  });

  it("requires the total the owner was shown", () => {
    expect(parseBookingRequest({ ...valid, expectedTotalCents: undefined }, TODAY)).toEqual({ ok: false, errors: ["expectedTotalCents is required"] });
  });

  it.each([-1, 12.5, "12600"])("refuses the total %j", (expectedTotalCents) => {
    expect(parseBookingRequest({ ...valid, expectedTotalCents }, TODAY)).toEqual({
      ok: false,
      errors: ["expectedTotalCents must be a whole number of cents"],
    });
  });

  it("reports target and total problems together", () => {
    const parsed = parseBookingRequest({ ...valid, from: "2026-10-20", expectedTotalCents: "x" }, TODAY);
    expect(parsed).toEqual({
      ok: false,
      errors: ["from cannot be in the past", "expectedTotalCents must be a whole number of cents"],
    });
  });
});

describe("parseSitterDecision", () => {
  it("maps the two answers to their statuses", () => {
    expect(parseSitterDecision({ decision: "confirm" })).toEqual({ ok: true, value: "confirmed" });
    expect(parseSitterDecision({ decision: "decline" })).toEqual({ ok: true, value: "declined" });
  });

  it.each([undefined, {}, { decision: "confirmed" }, { decision: "cancel" }])("refuses %j", (body) => {
    expect(parseSitterDecision(body)).toEqual({ ok: false, errors: ["decision must be confirm or decline"] });
  });
});
