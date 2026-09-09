CREATE TYPE "public"."affiliate_actor_type" AS ENUM('user', 'organization');--> statement-breakpoint
CREATE TYPE "public"."affiliate_commission_type" AS ENUM('percent', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."affiliate_earning_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."affiliate_referral_source" AS ENUM('coupon', 'link');--> statement-breakpoint
CREATE TYPE "public"."affiliate_referral_status" AS ENUM('attributed', 'converted', 'voided');--> statement-breakpoint
CREATE TYPE "public"."affiliate_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TABLE "affiliate" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_type" "affiliate_actor_type" NOT NULL,
	"user_id" text,
	"organization_id" text,
	"code" text NOT NULL,
	"commission_type" "affiliate_commission_type" DEFAULT 'percent' NOT NULL,
	"commission_value" integer DEFAULT 0 NOT NULL,
	"status" "affiliate_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "affiliate_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "affiliate_earning" (
	"id" text PRIMARY KEY NOT NULL,
	"affiliate_id" text NOT NULL,
	"referral_id" text NOT NULL,
	"invoice_id" text,
	"amount_mzn" integer NOT NULL,
	"status" "affiliate_earning_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "affiliate_referral" (
	"id" text PRIMARY KEY NOT NULL,
	"affiliate_id" text NOT NULL,
	"code" text NOT NULL,
	"source" "affiliate_referral_source" DEFAULT 'coupon' NOT NULL,
	"referred_organization_id" text,
	"status" "affiliate_referral_status" DEFAULT 'attributed' NOT NULL,
	"converted_invoice_id" text,
	"commission_amount_mzn" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"converted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "affiliate" ADD CONSTRAINT "affiliate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate" ADD CONSTRAINT "affiliate_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earning" ADD CONSTRAINT "affiliate_earning_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earning" ADD CONSTRAINT "affiliate_earning_referral_id_affiliate_referral_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."affiliate_referral"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_earning" ADD CONSTRAINT "affiliate_earning_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referral" ADD CONSTRAINT "affiliate_referral_affiliate_id_affiliate_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliate"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referral" ADD CONSTRAINT "affiliate_referral_referred_organization_id_organization_id_fk" FOREIGN KEY ("referred_organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referral" ADD CONSTRAINT "affiliate_referral_converted_invoice_id_invoice_id_fk" FOREIGN KEY ("converted_invoice_id") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_user_idx" ON "affiliate" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "affiliate_org_idx" ON "affiliate" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "affiliate_earning_affiliate_idx" ON "affiliate_earning" USING btree ("affiliate_id");--> statement-breakpoint
CREATE INDEX "affiliate_earning_referral_idx" ON "affiliate_earning" USING btree ("referral_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_earning_referral_invoice_uidx" ON "affiliate_earning" USING btree ("referral_id","invoice_id");--> statement-breakpoint
CREATE INDEX "affiliate_referral_affiliate_idx" ON "affiliate_referral" USING btree ("affiliate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliate_referral_org_uidx" ON "affiliate_referral" USING btree ("referred_organization_id");--> statement-breakpoint
CREATE INDEX "affiliate_referral_status_idx" ON "affiliate_referral" USING btree ("status");