CREATE TYPE "public"."vendor_service_type" AS ENUM('rentals', 'florals', 'av', 'photography', 'transportation', 'decor', 'entertainment', 'other');--> statement-breakpoint
CREATE TABLE "event_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"role" varchar(255),
	"cost" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_event_vendors_event_vendor" UNIQUE("event_id","vendor_id")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"service_type" "vendor_service_type" NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "vendor_id" integer;--> statement-breakpoint
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_vendors" ADD CONSTRAINT "event_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_vendors_event_id" ON "event_vendors" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_vendors_vendor_id" ON "event_vendors" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_vendors_company_name" ON "vendors" USING btree ("company_name");--> statement-breakpoint
CREATE INDEX "idx_vendors_service_type" ON "vendors" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "idx_vendors_is_active" ON "vendors" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expenses_vendor_id" ON "expenses" USING btree ("vendor_id");