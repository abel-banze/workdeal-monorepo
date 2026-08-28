CREATE TYPE "public"."bid_status" AS ENUM('awarded', 'in_progress', 'completed', 'cancelled', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('registered', 'cancelled', 'checked_in');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('draft', 'published', 'cancelled', 'ended');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('submitted', 'shortlisted', 'rejected', 'withdrawn', 'accepted');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'in_review', 'in_progress', 'completed', 'cancelled', 'withdrawn');--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"organizer_profile_id" text NOT NULL,
	"category_id" text,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"online_url" text,
	"venue_name" text,
	"province" text,
	"district" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"geom" "geography",
	"cover_image" text,
	"capacity" integer,
	"status" "event_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "event_registration_status" DEFAULT 'registered' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"requester_user_id" text NOT NULL,
	"requester_organization_id" text,
	"category_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price_min_mzn" integer,
	"price_max_mzn" integer,
	"province" text,
	"district" text,
	"address" text,
	"latitude" double precision,
	"longitude" double precision,
	"geom" "geography",
	"due_at" timestamp,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_bid" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"proposal_id" text NOT NULL,
	"provider_profile_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"agreed_price_mzn" integer NOT NULL,
	"agreed_deadline_at" timestamp,
	"status" "bid_status" DEFAULT 'awarded' NOT NULL,
	"review_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_proposal" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"provider_profile_id" text NOT NULL,
	"message" text NOT NULL,
	"price_mzn" integer,
	"estimated_days" integer,
	"status" "proposal_status" DEFAULT 'submitted' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_organizer_profile_id_profile_id_fk" FOREIGN KEY ("organizer_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_requester_organization_id_organization_id_fk" FOREIGN KEY ("requester_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bid" ADD CONSTRAINT "task_bid_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bid" ADD CONSTRAINT "task_bid_proposal_id_task_proposal_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."task_proposal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bid" ADD CONSTRAINT "task_bid_provider_profile_id_profile_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_bid" ADD CONSTRAINT "task_bid_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_proposal" ADD CONSTRAINT "task_proposal_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_proposal" ADD CONSTRAINT "task_proposal_provider_profile_id_profile_id_fk" FOREIGN KEY ("provider_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_status_start_idx" ON "event" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "event_slug_idx" ON "event" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "event_organizer_idx" ON "event" USING btree ("organizer_profile_id");--> statement-breakpoint
CREATE INDEX "event_category_idx" ON "event" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "event_geo_idx" ON "event" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "event_geom_gist_idx" ON "event" USING gist ("geom");--> statement-breakpoint
CREATE UNIQUE INDEX "event_registration_event_user_idx" ON "event_registration" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_registration_user_idx" ON "event_registration" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_registration_status_idx" ON "event_registration" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_status_created_idx" ON "task" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "task_category_idx" ON "task" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "task_requester_user_idx" ON "task" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "task_geo_idx" ON "task" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "task_geom_gist_idx" ON "task" USING gist ("geom");--> statement-breakpoint
CREATE UNIQUE INDEX "task_bid_proposal_idx" ON "task_bid" USING btree ("proposal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_bid_task_idx" ON "task_bid" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_bid_provider_idx" ON "task_bid" USING btree ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "task_bid_requester_idx" ON "task_bid" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "task_bid_status_idx" ON "task_bid" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "task_proposal_task_provider_idx" ON "task_proposal" USING btree ("task_id","provider_profile_id");--> statement-breakpoint
CREATE INDEX "task_proposal_provider_idx" ON "task_proposal" USING btree ("provider_profile_id");--> statement-breakpoint
CREATE INDEX "task_proposal_status_idx" ON "task_proposal" USING btree ("status");