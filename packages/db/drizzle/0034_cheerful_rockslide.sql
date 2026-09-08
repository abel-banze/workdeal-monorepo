CREATE TYPE "public"."institution_type" AS ENUM('association', 'chamber_of_commerce', 'ngo', 'foundation', 'cooperative', 'union', 'professional_body', 'educational', 'religious', 'public_body', 'other');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('pending', 'approved', 'rejected', 'revoked', 'verified');--> statement-breakpoint
CREATE TYPE "public"."membership_type" AS ENUM('member', 'partner', 'associate', 'affiliate', 'other');--> statement-breakpoint
ALTER TYPE "public"."profile_type" ADD VALUE 'institution';--> statement-breakpoint
CREATE TABLE "institution" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"legal_name" text,
	"organization_type" "institution_type" NOT NULL,
	"founded_at" timestamp,
	"website" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"province" text,
	"district" text,
	"city" text,
	"address" text,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "institution_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "institution_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "institution_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"institution_id" text NOT NULL,
	"company_profile_id" text NOT NULL,
	"membership_type" "membership_type" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'pending' NOT NULL,
	"requested_by_id" text,
	"approved_by_id" text,
	"approved_at" timestamp,
	"verified_by_id" text,
	"verified_at" timestamp,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution" ADD CONSTRAINT "institution_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_membership" ADD CONSTRAINT "institution_membership_institution_id_institution_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_membership" ADD CONSTRAINT "institution_membership_company_profile_id_profile_id_fk" FOREIGN KEY ("company_profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_membership" ADD CONSTRAINT "institution_membership_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_membership" ADD CONSTRAINT "institution_membership_approved_by_id_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_membership" ADD CONSTRAINT "institution_membership_verified_by_id_user_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "institution_slug_idx" ON "institution" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "institution_type_idx" ON "institution" USING btree ("organization_type");--> statement-breakpoint
CREATE INDEX "institution_status_idx" ON "institution" USING btree ("status");--> statement-breakpoint
CREATE INDEX "institution_verification_idx" ON "institution" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "institution_membership_inst_company_idx" ON "institution_membership" USING btree ("institution_id","company_profile_id");--> statement-breakpoint
CREATE INDEX "institution_membership_institution_status_idx" ON "institution_membership" USING btree ("institution_id","status");--> statement-breakpoint
CREATE INDEX "institution_membership_company_status_idx" ON "institution_membership" USING btree ("company_profile_id","status");--> statement-breakpoint
CREATE INDEX "institution_membership_requested_by_idx" ON "institution_membership" USING btree ("requested_by_id");