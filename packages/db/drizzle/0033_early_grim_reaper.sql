CREATE TYPE "public"."admin_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "admin_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "system_role" DEFAULT 'moderator' NOT NULL,
	"status" "admin_invite_status" DEFAULT 'pending' NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"revoked_at" timestamp,
	"invited_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_invite_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "admin_invite" ADD CONSTRAINT "admin_invite_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_invite_email_idx" ON "admin_invite" USING btree ("email");--> statement-breakpoint
CREATE INDEX "admin_invite_status_idx" ON "admin_invite" USING btree ("status");