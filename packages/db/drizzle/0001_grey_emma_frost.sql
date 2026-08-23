CREATE TYPE "public"."badge_origin" AS ENUM('automatic', 'manual', 'paid');--> statement-breakpoint
CREATE TYPE "public"."badge_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."badge_type" AS ENUM('trust', 'quality', 'activity', 'reputation', 'specialization', 'network', 'performance', 'commercial', 'promotional', 'informational');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('draft', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('individual', 'company');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('profile', 'review', 'task', 'event');--> statement-breakpoint
CREATE TYPE "public"."review_origin" AS ENUM('directory', 'task', 'event');--> statement-breakpoint
CREATE TYPE "public"."verification_request_status" AS ENUM('pending', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "badge" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "badge_type" NOT NULL,
	"origin" "badge_origin" NOT NULL,
	"criteria" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badge_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"parent_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "follow" (
	"follower_user_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "follow_follower_user_id_profile_id_pk" PRIMARY KEY("follower_user_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "portfolio_item" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "profile_type" NOT NULL,
	"user_id" text,
	"organization_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"logo_url" text,
	"cover_url" text,
	"latitude" double precision,
	"longitude" double precision,
	"whatsapp" text,
	"phone" text,
	"email" text,
	"website" text,
	"business_hours" jsonb,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "profile_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profile_badge" (
	"profile_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"origin" "badge_origin" NOT NULL,
	"status" "badge_status" DEFAULT 'active' NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	"awarded_by_user_id" text,
	CONSTRAINT "profile_badge_profile_id_badge_id_pk" PRIMARY KEY("profile_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "profile_category" (
	"profile_id" text NOT NULL,
	"category_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "profile_category_profile_id_category_id_pk" PRIMARY KEY("profile_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_user_id" text NOT NULL,
	"target_type" "report_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"origin" "review_origin" DEFAULT 'directory' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_request" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"status" "verification_request_status" DEFAULT 'pending' NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reviewer_user_id" text,
	"reviewed_at" timestamp,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_user_id_user_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow" ADD CONSTRAINT "follow_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_item" ADD CONSTRAINT "portfolio_item_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_badge" ADD CONSTRAINT "profile_badge_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_badge" ADD CONSTRAINT "profile_badge_badge_id_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_badge" ADD CONSTRAINT "profile_badge_awarded_by_user_id_user_id_fk" FOREIGN KEY ("awarded_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_category" ADD CONSTRAINT "profile_category_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_category" ADD CONSTRAINT "profile_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_request" ADD CONSTRAINT "verification_request_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_request" ADD CONSTRAINT "verification_request_reviewer_user_id_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_slug_idx" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "follow_profile_id_idx" ON "follow" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "portfolio_item_profile_id_idx" ON "portfolio_item" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_user_id_idx" ON "profile" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_organization_id_idx" ON "profile" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "profile_type_status_idx" ON "profile" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "profile_geo_idx" ON "profile" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "profile_slug_idx" ON "profile" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "profile_badge_badge_id_idx" ON "profile_badge" USING btree ("badge_id");--> statement-breakpoint
CREATE INDEX "profile_badge_status_idx" ON "profile_badge" USING btree ("profile_id","status");--> statement-breakpoint
CREATE INDEX "profile_category_category_id_idx" ON "profile_category" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "report_target_idx" ON "report" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "report_status_idx" ON "report" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "review_profile_author_origin_idx" ON "review" USING btree ("profile_id","author_user_id","origin");--> statement-breakpoint
CREATE INDEX "review_profile_id_idx" ON "review" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "verification_request_profile_id_idx" ON "verification_request" USING btree ("profile_id");