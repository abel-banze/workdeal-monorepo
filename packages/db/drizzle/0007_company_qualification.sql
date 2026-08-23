CREATE TYPE "public"."company_size" AS ENUM('micro', 'pequena', 'media', 'grande');--> statement-breakpoint
CREATE TYPE "public"."legal_form" AS ENUM('lda', 'su', 'unipessoal', 'cooperativa', 'outro');--> statement-breakpoint
CREATE TABLE "company_qualification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"profile_id" text,
	"company_size" "company_size" NOT NULL,
	"workers" integer NOT NULL,
	"turnover_mzn" integer,
	"founded_year" integer,
	"legal_form" "legal_form",
	"nuit" text,
	"alvara" text,
	"capital_social_mzn" integer,
	"licenses" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_qualification_organization_id_unique" UNIQUE("organization_id")
);--> statement-breakpoint
ALTER TABLE "company_qualification" ADD CONSTRAINT "company_qualification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_qualification" ADD CONSTRAINT "company_qualification_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_qualification_org_idx" ON "company_qualification" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "company_qualification_profile_idx" ON "company_qualification" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "company_qualification_size_idx" ON "company_qualification" USING btree ("company_size");
