CREATE TYPE "public"."broadcast_channel" AS ENUM('whatsapp', 'email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('draft', 'ready', 'sending', 'sent');--> statement-breakpoint
CREATE TYPE "public"."broadcast_recipient_status" AS ENUM('pending', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "broadcast_campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"channel" "broadcast_channel" NOT NULL,
	"template_key" text,
	"subject" text,
	"body_html" text,
	"status" "broadcast_status" DEFAULT 'draft' NOT NULL,
	"total_recipients" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "broadcast_campaign_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE TABLE "broadcast_recipient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"organization_id" text,
	"address" text NOT NULL,
	"company_name" text,
	"status" "broadcast_recipient_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "broadcast_recipient_campaign_id_broadcast_campaign_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."broadcast_campaign"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "broadcast_recipient_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "broadcast_campaign_status_idx" ON "broadcast_campaign" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "broadcast_recipient_campaign_address_idx" ON "broadcast_recipient" USING btree ("campaign_id","address");--> statement-breakpoint
CREATE INDEX "broadcast_recipient_pending_idx" ON "broadcast_recipient" USING btree ("campaign_id","status");
