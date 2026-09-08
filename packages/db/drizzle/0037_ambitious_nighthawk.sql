CREATE TYPE "public"."event_visibility" AS ENUM('public', 'members_only', 'private');--> statement-breakpoint
ALTER TYPE "public"."membership_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TYPE "public"."verification_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "visibility" "event_visibility" DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "inherit_from_plan_id" text;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "max_branches" integer;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "api_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "plan" ADD COLUMN "max_api_calls_per_month" integer;--> statement-breakpoint
ALTER TABLE "plan" ADD CONSTRAINT "plan_inherit_from_plan_id_plan_id_fk" FOREIGN KEY ("inherit_from_plan_id") REFERENCES "public"."plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_inherit_idx" ON "plan" USING btree ("inherit_from_plan_id");