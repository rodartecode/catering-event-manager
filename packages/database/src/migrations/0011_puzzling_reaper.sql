CREATE TYPE "public"."staff_skill" AS ENUM('food_safety_cert', 'bartender', 'sommelier', 'lead_chef', 'sous_chef', 'prep_cook', 'pastry_chef', 'server', 'event_coordinator', 'barista');--> statement-breakpoint
CREATE TABLE "staff_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"is_recurring" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_skills" (
	"user_id" integer NOT NULL,
	"skill" "staff_skill" NOT NULL,
	"certified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_skills_user_id_skill_pk" PRIMARY KEY("user_id","skill")
);
--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_skills" ADD CONSTRAINT "staff_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_staff_availability_user_id" ON "staff_availability" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_staff_availability_composite" ON "staff_availability" USING btree ("user_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_staff_skills_user_id" ON "staff_skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_staff_skills_skill" ON "staff_skills" USING btree ("skill");--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_resources_user_id" ON "resources" USING btree ("user_id") WHERE user_id IS NOT NULL;