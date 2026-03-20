CREATE TYPE "public"."dietary_tag" AS ENUM('vegan', 'vegetarian', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free');--> statement-breakpoint
CREATE TYPE "public"."menu_item_category" AS ENUM('appetizer', 'main', 'side', 'dessert', 'beverage');--> statement-breakpoint
CREATE TABLE "event_menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_menu_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity_override" integer,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_event_menu_items_menu_item" UNIQUE("event_menu_id","menu_item_id")
);
--> statement-breakpoint
CREATE TABLE "event_menus" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cost_per_person" numeric(10, 2) NOT NULL,
	"category" "menu_item_category" NOT NULL,
	"allergens" text[] DEFAULT '{}',
	"dietary_tags" "dietary_tag"[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_menu_items" ADD CONSTRAINT "event_menu_items_event_menu_id_event_menus_id_fk" FOREIGN KEY ("event_menu_id") REFERENCES "public"."event_menus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_menu_items" ADD CONSTRAINT "event_menu_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_menus" ADD CONSTRAINT "event_menus_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_event_menu_items_event_menu_id" ON "event_menu_items" USING btree ("event_menu_id");--> statement-breakpoint
CREATE INDEX "idx_event_menu_items_menu_item_id" ON "event_menu_items" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "idx_event_menus_event_id" ON "event_menus" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_menu_items_category" ON "menu_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_menu_items_is_active" ON "menu_items" USING btree ("is_active");