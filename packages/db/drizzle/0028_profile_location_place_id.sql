-- 0028: evoluir profile_location — adicionar place_id (google_place_id)
-- Mantém province (pt-MZ), district, bairro
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_location' AND column_name='google_place_id') THEN
    ALTER TABLE "profile_location" ADD COLUMN "google_place_id" text;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_location_google_place_id_idx" ON "profile_location" USING btree ("google_place_id");
