CREATE TYPE "public"."visibility" AS ENUM('exact', 'zone');--> statement-breakpoint
CREATE TABLE "profile_location" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"organization_id" text,
	"label" text,
	"province" text NOT NULL,
	"district" text,
	"bairro" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"geom" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"visibility" "visibility" DEFAULT 'zone' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "profile_location" ADD CONSTRAINT "profile_location_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_location" ADD CONSTRAINT "profile_location_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_location_profile_idx" ON "profile_location" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "profile_location_org_idx" ON "profile_location" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "profile_location_province_idx" ON "profile_location" USING btree ("province");--> statement-breakpoint
CREATE INDEX "profile_location_geo_idx" ON "profile_location" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE INDEX "tag_slug_idx" ON "tag" USING btree ("slug");--> statement-breakpoint
CREATE TABLE "profile_tag" (
	"profile_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_tag_profile_id_tag_id_pk" PRIMARY KEY("profile_id","tag_id")
);--> statement-breakpoint
ALTER TABLE "profile_tag" ADD CONSTRAINT "profile_tag_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_tag" ADD CONSTRAINT "profile_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_tag_tag_idx" ON "profile_tag" USING btree ("tag_id");
