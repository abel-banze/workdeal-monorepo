ALTER TABLE "event" ALTER COLUMN "start_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ALTER COLUMN "end_at" DROP NOT NULL;--> statement-breakpoint
ALTER TYPE "public"."event_registration_status" ADD VALUE 'interested';
