CREATE TYPE "public"."kitchen_type" AS ENUM('full', 'prep_only', 'warming_only', 'none');--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"capacity" integer,
	"has_kitchen" boolean DEFAULT false NOT NULL,
	"kitchen_type" "kitchen_type",
	"equipment_available" text[] DEFAULT '{}',
	"parking_notes" text,
	"load_in_notes" text,
	"contact_name" varchar(255),
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "venue_id" integer;--> statement-breakpoint
CREATE INDEX "idx_venues_name" ON "venues" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_venues_is_active" ON "venues" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_events_venue_id" ON "events" USING btree ("venue_id");--> statement-breakpoint
CREATE TRIGGER trg_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();--> statement-breakpoint
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;