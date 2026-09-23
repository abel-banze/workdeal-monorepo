CREATE TABLE "bulk_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text,
	"template" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bulk_send_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX "bulk_send_log_org_template_idx" ON "bulk_send_log" USING btree ("organization_id","template","channel");--> statement-breakpoint
CREATE INDEX "bulk_send_log_template_idx" ON "bulk_send_log" USING btree ("template","sent_at");
