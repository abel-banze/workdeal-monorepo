CREATE TYPE "public"."notification_status" AS ENUM('unread', 'read');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_user_id" text,
	"recipient_organization_id" text,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"status" "notification_status" DEFAULT 'unread' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_recipient_user_id_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "notification_recipient_organization_id_organization_id_fk" FOREIGN KEY ("recipient_organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "notification_user_idx" ON "notification" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_org_idx" ON "notification" USING btree ("recipient_organization_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_type_idx" ON "notification" USING btree ("type","created_at");
