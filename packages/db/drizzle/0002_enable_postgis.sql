-- PostGIS extension — tolerante a ambientes sem PostGIS (Windows dev sem bundle)
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS postgis; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PostGIS indisponível, geom ficará como text'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_trgm indisponível'; END $$;
-- Coluna geom: tenta geography, fallback para text se PostGIS não existir (IF NOT EXISTS já é idempotente)
DO $$ BEGIN
  ALTER TABLE "profile" ADD COLUMN "geom" geography(Point, 4326);
EXCEPTION WHEN OTHERS THEN
  BEGIN ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "geom" text; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
-- Backfill apenas se geography estiver disponível
DO $$ BEGIN
  UPDATE "profile" SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_geom_gist_idx" ON "profile" USING GIST ("geom"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
