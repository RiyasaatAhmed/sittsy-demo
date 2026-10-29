CREATE TYPE "public"."service" AS ENUM('boarding', 'day_care', 'drop_in', 'dog_walking', 'house_sitting');--> statement-breakpoint
CREATE TABLE "sitter_services" (
	"sitter_id" integer NOT NULL,
	"service" "service" NOT NULL,
	"price_eur" integer NOT NULL,
	CONSTRAINT "sitter_services_sitter_id_service_pk" PRIMARY KEY("sitter_id","service")
);
--> statement-breakpoint
CREATE TABLE "sitters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"rating_sum" integer NOT NULL,
	"rating_count" integer NOT NULL,
	"median_response_minutes" integer NOT NULL,
	"bookings_last_30d" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"identity_verified" boolean NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sitter_services" ADD CONSTRAINT "sitter_services_sitter_id_sitters_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."sitters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sitter_services_service_idx" ON "sitter_services" USING btree ("service");