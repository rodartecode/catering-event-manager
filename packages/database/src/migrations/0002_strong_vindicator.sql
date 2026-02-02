ALTER TYPE "public"."user_role" ADD VALUE 'client';--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"type" "communication_type" NOT NULL,
	"subject" varchar(255),
	"notes" text,
	"contacted_at" timestamp DEFAULT now() NOT NULL,
	"contacted_by" integer,
	"follow_up_date" timestamp,
	"follow_up_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_access_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" integer,
	"ip_address" varchar(45),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_schedule" (
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
CREATE TABLE "resources" (
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
CREATE TABLE "task_resources" (
	"task_id" integer NOT NULL,
	"resource_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_resources_task_id_resource_id_pk" PRIMARY KEY("task_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "client_id" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_enabled_at" timestamp;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_contacted_by_users_id_fk" FOREIGN KEY ("contacted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_log" ADD CONSTRAINT "portal_access_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_log" ADD CONSTRAINT "portal_access_log_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_schedule" ADD CONSTRAINT "resource_schedule_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_resources" ADD CONSTRAINT "task_resources_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_resources" ADD CONSTRAINT "task_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_communications_event_id" ON "communications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_communications_client_id" ON "communications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_communications_follow_up_date" ON "communications" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "idx_communications_contacted_at" ON "communications" USING btree ("contacted_at");--> statement-breakpoint
CREATE INDEX "idx_portal_access_log_user_id" ON "portal_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_access_log_client_id" ON "portal_access_log" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_portal_access_log_timestamp" ON "portal_access_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_resource_id" ON "resource_schedule" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_event_id" ON "resource_schedule" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_task_id" ON "resource_schedule" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_start_time" ON "resource_schedule" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_end_time" ON "resource_schedule" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "idx_resource_schedule_analytics" ON "resource_schedule" USING btree ("resource_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "idx_resources_type" ON "resources" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_resources_available" ON "resources" USING btree ("is_available");--> statement-breakpoint
CREATE INDEX "idx_resources_name" ON "resources" USING btree ("name");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_client_id" ON "users" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_events_analytics_status_created" ON "events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_events_analytics_archived_created" ON "events" USING btree ("is_archived","created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_analytics_category_status" ON "tasks" USING btree ("category","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_analytics_created_at" ON "tasks" USING btree ("created_at");