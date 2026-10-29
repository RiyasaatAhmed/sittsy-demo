import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { BOOKING_STATUSES, type Quote } from "@sitter/domain/booking";
import { SERVICES } from "@sitter/domain/sitter";
import { dateRange } from "./date-range-column";

export const serviceEnum = pgEnum("service", SERVICES);
export const bookingStatusEnum = pgEnum("booking_status", BOOKING_STATUSES);

export const sitters = pgTable("sitters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  /** Sum of all star ratings (1–5 each). Average = rating_sum / rating_count. */
  ratingSum: integer("rating_sum").notNull(),
  ratingCount: integer("rating_count").notNull(),
  medianResponseMinutes: integer("median_response_minutes").notNull(),
  bookingsLast30d: integer("bookings_last_30d").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  identityVerified: boolean("identity_verified").notNull(),
});

/** One row per (sitter, service) the sitter offers, with its price. */
export const sitterServices = pgTable(
  "sitter_services",
  {
    sitterId: integer("sitter_id")
      .notNull()
      .references(() => sitters.id, { onDelete: "cascade" }),
    service: serviceEnum("service").notNull(),
    priceEur: integer("price_eur").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sitterId, table.service] }),
    index("sitter_services_service_idx").on(table.service),
  ],
);

/**
 * Periods when a sitter cannot take any stay (away, already busy elsewhere),
 * as [first night, day back) date ranges. Overlaps are allowed here; bookings
 * have their own non-overlap rule.
 */
export const sitterUnavailability = pgTable(
  "sitter_unavailability",
  {
    id: serial("id").primaryKey(),
    sitterId: integer("sitter_id")
      .notNull()
      .references(() => sitters.id, { onDelete: "cascade" }),
    period: dateRange("period").notNull(),
    reason: text("reason").notNull(),
  },
  (table) => [
    // GiST indexes ranges, so "who is away during these dates?" (&&) stays fast.
    index("sitter_unavailability_period_idx").using("gist", table.period),
    // A period has a first night and a day back: never empty or open-ended.
    check("sitter_unavailability_period_bounded", sql`NOT isempty(${table.period}) AND NOT lower_inf(${table.period}) AND NOT upper_inf(${table.period})`),
  ],
);

/**
 * Demo pet owners. There are no accounts: a browser gets a random token in an
 * HttpOnly cookie during the session handshake, and only the token's SHA-256
 * hash is stored, so a database leak does not reveal usable tokens.
 */
export const demoOwners = pgTable("demo_owners", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Booking requests. The stay is a [check-in, check-out) date range. A sitter's
 * requested and confirmed bookings may not overlap: an exclusion constraint
 * (`bookings_no_overlap`, in a hand-written migration because Drizzle cannot
 * declare one) enforces that even for concurrent requests.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => demoOwners.id, { onDelete: "cascade" }),
    sitterId: integer("sitter_id")
      .notNull()
      .references(() => sitters.id, { onDelete: "cascade" }),
    service: serviceEnum("service").notNull(),
    period: dateRange("period").notNull(),
    status: bookingStatusEnum("status").notNull(),
    /** The itemised quote shown to the owner, as recorded when they sent the request. */
    quote: jsonb("quote").$type<Quote>().notNull(),
    /** Same as quote.totalCents; a column so totals can be summed in SQL. */
    totalCents: integer("total_cents").notNull(),
    /** The client's Idempotency-Key: a repeated submission returns this booking instead of a new one. */
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    /** When an unanswered request stops holding the dates (requestExpiresAt). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("bookings_owner_idempotency_key").on(table.ownerId, table.idempotencyKey),
    index("bookings_owner_idx").on(table.ownerId, table.createdAt),
    check("bookings_period_bounded", sql`NOT isempty(${table.period}) AND NOT lower_inf(${table.period}) AND NOT upper_inf(${table.period})`),
    check("bookings_total_not_negative", sql`${table.totalCents} >= 0`),
  ],
);
