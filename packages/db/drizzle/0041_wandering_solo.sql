ALTER TABLE "verification_request" ADD COLUMN "br_number" text;--> statement-breakpoint
ALTER TABLE "verification_request" ADD COLUMN "payment_proof" jsonb;