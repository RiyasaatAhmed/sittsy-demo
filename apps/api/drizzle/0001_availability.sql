CREATE TABLE "sitter_unavailability" (
	"id" serial PRIMARY KEY NOT NULL,
	"sitter_id" integer NOT NULL,
	"period" daterange NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "sitter_unavailability_period_bounded" CHECK (NOT isempty("sitter_unavailability"."period") AND NOT lower_inf("sitter_unavailability"."period") AND NOT upper_inf("sitter_unavailability"."period"))
);
--> statement-breakpoint
ALTER TABLE "sitter_unavailability" ADD CONSTRAINT "sitter_unavailability_sitter_id_sitters_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."sitters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sitter_unavailability_period_idx" ON "sitter_unavailability" USING gist ("period");