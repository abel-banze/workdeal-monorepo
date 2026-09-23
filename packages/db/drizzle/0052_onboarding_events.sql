CREATE TABLE "onboarding_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"visitor_id" text,
	"step" smallint,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "onboarding_event_user_idx" ON "onboarding_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "onboarding_event_action_created_idx" ON "onboarding_event" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "onboarding_event_visitor_idx" ON "onboarding_event" USING btree ("visitor_id");
