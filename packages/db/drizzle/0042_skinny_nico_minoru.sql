CREATE TABLE "feature_flag" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_enabled" boolean DEFAULT false NOT NULL,
	"emergency_disabled" boolean DEFAULT false NOT NULL,
	"group" text,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flag_override" (
	"id" text PRIMARY KEY NOT NULL,
	"flag_key" text NOT NULL,
	"organization_id" text NOT NULL,
	"enabled" boolean NOT NULL,
	"note" text,
	"created_by_user_id" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_flag_key_feature_flag_key_fk" FOREIGN KEY ("flag_key") REFERENCES "public"."feature_flag"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flag_override" ADD CONSTRAINT "feature_flag_override_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_flag_group_idx" ON "feature_flag" USING btree ("group");--> statement-breakpoint
CREATE INDEX "feature_flag_default_idx" ON "feature_flag" USING btree ("default_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flag_override_unique_idx" ON "feature_flag_override" USING btree ("flag_key","organization_id");--> statement-breakpoint
CREATE INDEX "feature_flag_override_org_idx" ON "feature_flag_override" USING btree ("organization_id");