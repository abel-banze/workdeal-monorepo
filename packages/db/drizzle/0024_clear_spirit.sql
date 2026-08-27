CREATE TYPE "public"."verification_level" AS ENUM('level1', 'level2');--> statement-breakpoint
ALTER TABLE "verification_request" ADD COLUMN "level" "verification_level" DEFAULT 'level1' NOT NULL;