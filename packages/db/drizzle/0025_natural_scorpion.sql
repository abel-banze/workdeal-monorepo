CREATE TABLE "profile_bookmark" (
	"user_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_bookmark_user_id_profile_id_pk" PRIMARY KEY("user_id","profile_id")
);
--> statement-breakpoint
ALTER TABLE "profile_bookmark" ADD CONSTRAINT "profile_bookmark_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bookmark" ADD CONSTRAINT "profile_bookmark_profile_id_profile_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profile"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_bookmark_profile_idx" ON "profile_bookmark" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");