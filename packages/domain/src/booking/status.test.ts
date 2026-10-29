import { describe, expect, it } from "vitest";
import { BOOKING_STATUSES, canTransition, holdsCapacity, requestExpiresAt, statusAt } from "./status";

describe("booking status", () => {
  it("holds capacity only while requested or confirmed", () => {
    expect(BOOKING_STATUSES.filter(holdsCapacity)).toEqual(["requested", "confirmed"]);
  });

  it("allows only the documented transitions", () => {
    expect(canTransition("requested", "confirmed")).toBe(true);
    expect(canTransition("requested", "expired")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "declined")).toBe(false);
    expect(canTransition("expired", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "requested")).toBe(false);
  });

  it("expires an unanswered request after 24 hours", () => {
    expect(requestExpiresAt(new Date("2026-10-29T10:00:00Z")).toISOString()).toBe("2026-10-30T10:00:00.000Z");
  });

  it("reads an unanswered request as expired from its expiry time on", () => {
    const expiresAt = new Date("2026-10-30T10:00:00Z");
    expect(statusAt("requested", expiresAt, new Date("2026-10-30T09:59:59Z"))).toBe("requested");
    expect(statusAt("requested", expiresAt, expiresAt)).toBe("expired");
    expect(statusAt("confirmed", expiresAt, new Date("2026-11-30T00:00:00Z"))).toBe("confirmed");
    expect(statusAt("cancelled", expiresAt, new Date("2026-11-30T00:00:00Z"))).toBe("cancelled");
  });
});
