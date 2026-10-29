CREATE TABLE "activity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"search_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sitter_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_once_per_search_sitter" UNIQUE("search_id","kind","sitter_id"),
	CONSTRAINT "activity_kind" CHECK ("activity_events"."kind" IN ('impression', 'profile', 'request', 'confirmation'))
);
--> statement-breakpoint
CREATE TABLE "search_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"policy_version" text NOT NULL,
	"source" text DEFAULT 'interactive_demo' NOT NULL,
	"criteria" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "search_id" uuid;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_search_id_search_runs_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_sitter_id_sitters_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."sitters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_runs" ADD CONSTRAINT "search_runs_owner_id_demo_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."demo_owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_runs_owner_idx" ON "search_runs" USING btree ("owner_id","created_at");--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_search_id_search_runs_id_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search_runs"("id") ON DELETE set null ON UPDATE no action;