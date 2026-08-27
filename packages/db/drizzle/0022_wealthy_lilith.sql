-- Restauro das colunas PostGIS `geom` (perdidas por `drizzle-kit push`)
-- --------------------------------------------------------------------
-- Contexto: o commit efe972b removeu `geom` do schema.ts (porque o drizzle-kit
-- v0.31 não sabe emitir tipos parametrizados como geography(...)) e um `push`
-- posterior executou DROP COLUMN em `profile.geom`, `profile_location.geom`
-- e nos índices GIST.
--
-- Esta migração (gerada por drizzle-kit generate + corrigida à mão para ser
-- idempotente) restaura as colunas: só ADiciona a coluna se não existir, faz
-- backfill a partir de latitude/longitude e recria os índices GIST.
--
-- O tipo usado é `geography` (sem typmod): é o que o drizzle-kit emite como SQL
-- válido (`"geography"`) e que o schema/customType declara, para que `push`/
-- `generate` futuros sejam idempotentes em vez de descartarem a coluna de novo.
-- As queries nearby passam valores via `ST_MakePoint(...)::geography` (Point/4326),
-- logo o tipo efectivo mantém-se geográfico e as distâncias são em metros.

DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS postgis; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PostGIS indisponível, geom ficará ausente'; END $$;--> statement-breakpoint

-- profile.geom
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='geom') THEN
    ALTER TABLE "profile" ADD COLUMN "geom" geography;
  END IF;
END $$;--> statement-breakpoint

-- profile_location.geom
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_location' AND column_name='geom') THEN
    ALTER TABLE "profile_location" ADD COLUMN "geom" geography;
  END IF;
END $$;--> statement-breakpoint

-- Backfill a partir de lat/lng (idempotente; ST_MakePoint usa ordem lng,lat)
UPDATE "profile"
   SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
 WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "geom" IS NULL;--> statement-breakpoint

UPDATE "profile_location"
   SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
 WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "geom" IS NULL;--> statement-breakpoint

-- Índices GIST para pesquisa "nearby" (ST_DWithin / ST_Distance / <->)
CREATE INDEX IF NOT EXISTS "profile_geom_gist_idx" ON "profile" USING GIST ("geom");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profile_location_geom_gist_idx" ON "profile_location" USING GIST ("geom");
