CREATE TABLE "service" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price_mzn" integer,
	"image_url" text,
	"category_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ALTER COLUMN "geom" SET DATA TYPE "undefined"."geography(Point,4326)";--> statement-breakpoint
ALTER TABLE "profile_location" ALTER COLUMN "geom" SET DATA TYPE "undefined"."geography(Point,4326)";--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service" ADD CONSTRAINT "service_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_profile_id_idx" ON "service" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "service_category_id_idx" ON "service" USING btree ("category_id");