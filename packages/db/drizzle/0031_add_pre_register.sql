-- 0031: pré-registo de empresas (promoter/FACIM)
-- 1) novo estado no enum verification_status: "pre_registered"
-- 2) novas colunas na tabela "organization" para o pré-registo e notificação

DO $$ BEGIN
  ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'pre_registered';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='pre_registered_at') THEN
    ALTER TABLE "organization" ADD COLUMN "pre_registered_at" timestamp;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='pre_registered_by') THEN
    ALTER TABLE "organization" ADD COLUMN "pre_registered_by" text REFERENCES "user"("id") ON DELETE SET NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='contact_name') THEN
    ALTER TABLE "organization" ADD COLUMN "contact_name" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='contact_phone') THEN
    ALTER TABLE "organization" ADD COLUMN "contact_phone" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='contact_email') THEN
    ALTER TABLE "organization" ADD COLUMN "contact_email" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='completion_token') THEN
    ALTER TABLE "organization" ADD COLUMN "completion_token" text;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization' AND column_name='completion_token_expires_at') THEN
    ALTER TABLE "organization" ADD COLUMN "completion_token_expires_at" timestamp;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='organization_completion_token_idx') THEN
    CREATE INDEX "organization_completion_token_idx" ON "organization" USING btree ("completion_token");
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='organization_pre_registered_idx') THEN
    CREATE INDEX "organization_pre_registered_idx" ON "organization" USING btree ("verification_status");
  END IF;
END $$;