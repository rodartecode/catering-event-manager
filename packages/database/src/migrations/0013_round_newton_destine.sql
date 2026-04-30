CREATE TYPE "public"."prep_type" AS ENUM('marinate', 'bake', 'grill', 'plate', 'chop', 'mix', 'chill', 'fry', 'assemble', 'garnish');--> statement-breakpoint
CREATE TYPE "public"."production_task_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."station_type" AS ENUM('oven', 'grill', 'prep_counter', 'cold_storage', 'stovetop', 'fryer', 'mixer');--> statement-breakpoint
CREATE TABLE "kitchen_stations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "station_type" NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"venue_id" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"menu_item_id" integer,
	"station_id" integer,
	"name" varchar(255) NOT NULL,
	"prep_type" "prep_type" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"offset_minutes" integer NOT NULL,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"status" "production_task_status" DEFAULT 'pending' NOT NULL,
	"servings" integer,
	"assigned_to" integer,
	"depends_on_task_id" integer,
	"notes" text,
	"is_auto_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "production_steps" jsonb;--> statement-breakpoint
ALTER TABLE "kitchen_stations" ADD CONSTRAINT "kitchen_stations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_station_id_kitchen_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."kitchen_stations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_tasks" ADD CONSTRAINT "production_tasks_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_kitchen_stations_type" ON "kitchen_stations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_kitchen_stations_venue_id" ON "kitchen_stations" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "idx_kitchen_stations_is_active" ON "kitchen_stations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_event_id" ON "production_tasks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_menu_item_id" ON "production_tasks" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_station_id" ON "production_tasks" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_status" ON "production_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_scheduled_start" ON "production_tasks" USING btree ("scheduled_start");--> statement-breakpoint
CREATE INDEX "idx_production_tasks_station_time" ON "production_tasks" USING btree ("station_id","scheduled_start","scheduled_end");