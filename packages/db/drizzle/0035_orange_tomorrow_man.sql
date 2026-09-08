CREATE TYPE "public"."institution_operating_scope" AS ENUM('national', 'provincial', 'district', 'local');--> statement-breakpoint
CREATE TABLE "institution_manager" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_role" DEFAULT 'editor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "acronym" text;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "mission" text;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "vision" text;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "operating_scope" "institution_operating_scope";--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "social_links" jsonb;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "primary_contact" jsonb;--> statement-breakpoint
ALTER TABLE "institution" ADD COLUMN "verification_documents" jsonb;--> statement-breakpoint
ALTER TABLE "institution_manager" ADD CONSTRAINT "institution_manager_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_manager" ADD CONSTRAINT "institution_manager_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "institution_manager_institution_user_idx" ON "institution_manager" USING btree ("institution_id","user_id");--> statement-breakpoint
CREATE INDEX "institution_manager_user_idx" ON "institution_manager" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "institution_operating_scope_idx" ON "institution" USING btree ("operating_scope");--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_tax_id_unique" UNIQUE("tax_id");