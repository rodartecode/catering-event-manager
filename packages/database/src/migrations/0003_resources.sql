-- Resources table
CREATE TABLE IF NOT EXISTS "resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "resource_type" NOT NULL,
	"hourly_rate" numeric(10, 2),
	"is_available" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_type" ON "resources" USING btree ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_available" ON "resources" USING btree ("is_available");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resources_name" ON "resources" USING btree ("name");

--> statement-breakpoint
-- Task-Resources join table (many-to-many)
CREATE TABLE IF NOT EXISTS "task_resources" (
	"task_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_resources_pkey" PRIMARY KEY ("task_id", "resource_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_resources" ADD CONSTRAINT "task_resources_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_resources" ADD CONSTRAINT "task_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

--> statement-breakpoint
-- Resource Schedule table with time range columns
CREATE TABLE IF NOT EXISTS "resource_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"task_id" integer,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Ensure end_time is after start_time
ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_time_range_valid" CHECK ("end_time" > "start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_resource_id" ON "resource_schedule" USING btree ("resource_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_event_id" ON "resource_schedule" USING btree ("event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_task_id" ON "resource_schedule" USING btree ("task_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_start_time" ON "resource_schedule" USING btree ("start_time");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_end_time" ON "resource_schedule" USING btree ("end_time");

--> statement-breakpoint
-- Enable btree_gist extension for GiST index with integer and range types
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- Create GiST index for efficient overlap detection using range operators
-- This allows O(log n) conflict queries
CREATE INDEX IF NOT EXISTS "idx_resource_schedule_time_range_gist"
ON "resource_schedule" USING gist (
  "resource_id",
  tstzrange("start_time", "end_time", '[)')
);
--> statement-breakpoint
-- Exclusion constraint to prevent overlapping schedules for the same resource at DB level
ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_no_overlap"
EXCLUDE USING gist (
  "resource_id" WITH =,
  tstzrange("start_time", "end_time", '[)') WITH &&
);
