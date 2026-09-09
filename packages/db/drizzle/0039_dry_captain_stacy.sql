DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pgcrypto; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgcrypto indisponível, gen_random_uuid() vai falhar'; END $$;--> statement-breakpoint
ALTER TABLE "profile_bookmark" DROP CONSTRAINT "profile_bookmark_user_id_profile_id_pk";--> statement-breakpoint
ALTER TABLE "profile_bookmark" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_bookmark" ADD COLUMN "organization_id" text;--> statement-breakpoint
ALTER TABLE "profile_bookmark" ADD CONSTRAINT "profile_bookmark_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_bookmark_org_idx" ON "profile_bookmark" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_bookmark_personal_uidx" ON "profile_bookmark" USING btree ("user_id","profile_id") WHERE "profile_bookmark"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "profile_bookmark_org_uidx" ON "profile_bookmark" USING btree ("profile_id","organization_id") WHERE "profile_bookmark"."organization_id" is not null;