CREATE TYPE "public"."quote_status" AS ENUM('pending', 'viewed', 'quoted', 'declined', 'closed');--> statement-breakpoint
CREATE TABLE "quote_request" (
	"id" text PRIMARY KEY NOT NULL,
	"target_profile_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"requester_organization_id" text,
	"service_label" text NOT NULL,
	"service_tag" text,
	"portfolio_item_id" text,
	"message" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text,
	"status" "quote_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_target_profile_id_profile_id_fk" FOREIGN KEY ("target_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_requester_user_id_user_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_requester_organization_id_organization_id_fk" FOREIGN KEY ("requester_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_request" ADD CONSTRAINT "quote_request_portfolio_item_id_portfolio_item_id_fk" FOREIGN KEY ("portfolio_item_id") REFERENCES "public"."portfolio_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_request_target_idx" ON "quote_request" USING btree ("target_profile_id");--> statement-breakpoint
CREATE INDEX "quote_request_requester_idx" ON "quote_request" USING btree ("requester_user_id");--> statement-breakpoint
CREATE INDEX "quote_request_status_idx" ON "quote_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quote_request_created_idx" ON "quote_request" USING btree ("created_at");
