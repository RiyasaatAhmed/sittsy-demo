CREATE TYPE "public"."booking_status" AS ENUM('requested', 'confirmed', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"sitter_id" integer NOT NULL,
	"service" "service" NOT NULL,
	"period" daterange NOT NULL,
	"status" "booking_status" NOT NULL,
	"quote" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bookings_owner_idempotency_key" UNIQUE("owner_id","idempotency_key"),
	CONSTRAINT "bookings_period_bounded" CHECK (NOT isempty("bookings"."period") AND NOT lower_inf("bookings"."period") AND NOT upper_inf("bookings"."period")),
	CONSTRAINT "bookings_total_not_negative" CHECK ("bookings"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "demo_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_owners_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_demo_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."demo_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitter_id_sitters_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."sitters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_owner_idx" ON "bookings" USING btree ("owner_id","created_at");