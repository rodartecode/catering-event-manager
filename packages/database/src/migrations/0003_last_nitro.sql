CREATE TABLE "task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"category" "task_category" NOT NULL,
	"days_offset" integer NOT NULL,
	"depends_on_index" integer,
	"sort_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "template_id" integer;--> statement-breakpoint
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_template_items_template_id" ON "task_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "idx_task_template_items_sort_order" ON "task_template_items" USING btree ("template_id","sort_order");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_template_id_task_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE set null ON UPDATE no action;