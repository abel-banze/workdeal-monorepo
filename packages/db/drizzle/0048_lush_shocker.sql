CREATE TYPE "public"."tender_source" AS ENUM('ufsa');--> statement-breakpoint
CREATE TYPE "public"."tender_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "tender" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "tender_source" DEFAULT 'ufsa' NOT NULL,
	"reference" text NOT NULL,
	"ugea_id" text,
	"ugea_slug" text,
	"type" text,
	"category" text,
	"object" text,
	"province" text,
	"launched_at" timestamp,
	"opened_at" timestamp,
	"details_url" text,
	"regime" text,
	"modality" text,
	"class" text,
	"general_object" text,
	"currency" text,
	"estimated_value" numeric(16, 2),
	"provisional_guarantee" numeric(16, 2),
	"award_criteria" text,
	"lot_count" text,
	"proposal_delivery" text,
	"delivery_time" text,
	"opening_time" text,
	"observations" text,
	"published_at" timestamp,
	"details_fetched" boolean DEFAULT false NOT NULL,
	"description" text,
	"status" "tender_status" DEFAULT 'published' NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tender_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "tender_document" (
	"id" text PRIMARY KEY NOT NULL,
	"tender_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"url_valid" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ugea" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ugea_name_unique" UNIQUE("name"),
	CONSTRAINT "ugea_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "tender" ADD CONSTRAINT "tender_ugea_id_ugea_id_fk" FOREIGN KEY ("ugea_id") REFERENCES "public"."ugea"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_document" ADD CONSTRAINT "tender_document_tender_id_tender_id_fk" FOREIGN KEY ("tender_id") REFERENCES "public"."tender"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tender_reference_idx" ON "tender" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "tender_ugea_idx" ON "tender" USING btree ("ugea_id");--> statement-breakpoint
CREATE INDEX "tender_province_idx" ON "tender" USING btree ("province");--> statement-breakpoint
CREATE INDEX "tender_status_idx" ON "tender" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tender_details_fetched_idx" ON "tender" USING btree ("details_fetched");--> statement-breakpoint
CREATE INDEX "tender_status_published_idx" ON "tender" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "tender_category_idx" ON "tender" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "tender_document_tender_type_uidx" ON "tender_document" USING btree ("tender_id","type");--> statement-breakpoint
CREATE INDEX "tender_document_tender_idx" ON "tender_document" USING btree ("tender_id");--> statement-breakpoint
CREATE INDEX "ugea_name_idx" ON "ugea" USING btree ("name");--> statement-breakpoint
CREATE INDEX "ugea_slug_idx" ON "ugea" USING btree ("slug");