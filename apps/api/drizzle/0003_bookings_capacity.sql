-- Single capacity: a sitter's requested and confirmed bookings never share a
-- night. Drizzle cannot declare exclusion constraints, so this one is written
-- by hand. Postgres checks it on every insert and status change, including
-- concurrent ones: the second of two overlapping requests waits for the first
-- to commit, then fails with SQLSTATE 23P01 (exclusion_violation).
--
-- btree_gist lets a GiST index compare plain integers (sitter_id WITH =) next
-- to the date range (period WITH &&). It ships with Postgres and is a trusted
-- extension, so the database owner can enable it without being a superuser.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist ("sitter_id" WITH =, "period" WITH &&)
  WHERE ("status" IN ('requested', 'confirmed'));
