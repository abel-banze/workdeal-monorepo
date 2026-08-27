CREATE TYPE "public"."contact_channel" AS ENUM('whatsapp', 'phone', 'email', 'website');--> statement-breakpoint
CREATE TABLE "profile_contact_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"channel" "contact_channel" NOT NULL,
	"identifier" text NOT NULL,
	"verified_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_contact_verification" ADD CONSTRAINT "profile_contact_verification_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_contact_channel_identifier_idx" ON "profile_contact_verification" USING btree ("profile_id","channel","identifier");--> statement-breakpoint
CREATE INDEX "profile_contact_profile_idx" ON "profile_contact_verification" USING btree ("profile_id");