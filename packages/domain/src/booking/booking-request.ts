// Validation of what a client sends to quote or request a stay: the sitter,
// the service and the dates, plus (for a request) the total the owner saw.
// Same style as the search validators: the parsed value, or every problem
// found (the API turns them into a 400).

import type { IsoDate } from "../calendar";
import type { ParseResult } from "../shared";
import { SERVICES, isService } from "../sitter";
import { BOOKABLE_SERVICES, isBookableService, type BookableService } from "./rules";
import { parseStay, type Stay } from "./stay";

/** Which sitter, for which service and stay. */
export type BookingTarget = { sitterId: number; service: BookableService; stay: Stay };

/**
 * A booking request. `expectedTotalCents` is the total the owner was shown:
 * the server never records it, it only refuses the request when its own
 * quote differs (the price changed since the owner looked).
 */
export type BookingRequest = BookingTarget & { expectedTotalCents: number };

/** Largest Postgres `integer`: ids and amounts above it cannot exist. */
const MAX_INTEGER = 2_147_483_647;

/** A positive whole number, given as a JSON number or (from a URL) as digits. */
function readId(name: string, raw: unknown, errors: string[]): number | undefined {
  const value = typeof raw === "string" && /^\d{1,10}$/.test(raw) ? Number(raw) : raw;
  if (raw === undefined || raw === null || raw === "") {
    errors.push(`${name} is required`);
  } else if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_INTEGER) {
    errors.push(`${name} must be a positive whole number`);
  } else {
    return value;
  }
  return undefined;
}

function readBookableService(raw: unknown, errors: string[]): BookableService | undefined {
  if (raw === undefined || raw === null || raw === "") {
    errors.push("service is required");
  } else if (typeof raw !== "string" || !isService(raw)) {
    errors.push(`service must be one of: ${SERVICES.join(", ")}`);
  } else if (!isBookableService(raw)) {
    errors.push(`only ${BOOKABLE_SERVICES.join(", ")} can be booked in this demo`);
  } else {
    return raw;
  }
  return undefined;
}

const dateText = (raw: unknown): string | null => (typeof raw === "string" ? raw : null);

/** Validates the sitter, service and dates. `today` is the date in the booking time zone. */
export function parseBookingTarget(
  input: { sitterId: unknown; service: unknown; from: unknown; to: unknown },
  today: IsoDate,
): ParseResult<BookingTarget> {
  const errors: string[] = [];
  const sitterId = readId("sitterId", input.sitterId, errors);
  const service = readBookableService(input.service, errors);
  const stay = parseStay(dateText(input.from), dateText(input.to), today);
  if (!stay.ok) errors.push(...stay.errors);

  if (errors.length > 0 || sitterId === undefined || service === undefined || !stay.ok) {
    return { ok: false, errors };
  }
  return { ok: true, value: { sitterId, service, stay: stay.value } };
}

/**
 * Validates a booking request body:
 * `{ sitterId, service, from, to, expectedTotalCents }`, dates as YYYY-MM-DD.
 */
export function parseBookingRequest(body: unknown, today: IsoDate): ParseResult<BookingRequest> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["the body must be a JSON object"] };
  }
  const fields = body as Record<string, unknown>;
  const target = parseBookingTarget(
    { sitterId: fields.sitterId, service: fields.service, from: fields.from, to: fields.to },
    today,
  );
  const errors = target.ok ? [] : [...target.errors];

  const expected = fields.expectedTotalCents;
  if (expected === undefined || expected === null) {
    errors.push("expectedTotalCents is required");
  } else if (typeof expected !== "number" || !Number.isInteger(expected) || expected < 0 || expected > MAX_INTEGER) {
    errors.push("expectedTotalCents must be a whole number of cents");
  }

  if (!target.ok || errors.length > 0 || typeof expected !== "number") return { ok: false, errors };
  return { ok: true, value: { ...target.value, expectedTotalCents: expected } };
}

/** The two answers a sitter can give a request. */
export type SitterDecision = "confirmed" | "declined";

/** Validates `{ "decision": "confirm" | "decline" }` (the demo's stand-in for the sitter's answer). */
export function parseSitterDecision(body: unknown): ParseResult<SitterDecision> {
  const decision = typeof body === "object" && body !== null ? (body as Record<string, unknown>).decision : undefined;
  if (decision === "confirm") return { ok: true, value: "confirmed" };
  if (decision === "decline") return { ok: true, value: "declined" };
  return { ok: false, errors: ["decision must be confirm or decline"] };
}
