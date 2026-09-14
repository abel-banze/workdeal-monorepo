CREATE TYPE "public"."negotiation_sender_side" AS ENUM('requester', 'provider');--> statement-breakpoint
ALTER TABLE "negotiation_message" ADD COLUMN "sender_side" "negotiation_sender_side" NOT NULL;