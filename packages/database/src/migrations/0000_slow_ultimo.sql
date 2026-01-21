CREATE TYPE "public"."user_role" AS ENUM('administrator', 'manager');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('inquiry', 'planning', 'preparation', 'in_progress', 'completed', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('pre_event', 'during_event', 'post_event');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('staff', 'equipment', 'materials');--> statement-breakpoint
CREATE TYPE "public"."communication_type" AS ENUM('email', 'phone', 'meeting', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'manager' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"event_name" varchar(255) NOT NULL,
	"event_date" timestamp NOT NULL,
	"location" varchar(500),
	"status" "event_status" DEFAULT 'inquiry' NOT NULL,
	"estimated_attendees" integer,
	"notes" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp,
	"archived_by" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_status_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"old_status" "event_status",
	"new_status" "event_status" NOT NULL,
	"changed_by" integer NOT NULL,
	"notes" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_status_log" ADD CONSTRAINT "event_status_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_status_log" ADD CONSTRAINT "event_status_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_client_id" ON "events" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_date" ON "events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_status" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_archived" ON "events" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_events_composite" ON "events" USING btree ("status","event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_status_log_event_id" ON "event_status_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_event_status_log_changed_at" ON "event_status_log" USING btree ("changed_at");