CREATE TABLE "otp_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"identifier" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_challenge_identifier_idx" ON "otp_challenge" USING btree ("channel","identifier","created_at");