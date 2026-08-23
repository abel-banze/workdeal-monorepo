-- WS1 hardening: tsvector + triggers — tolerante sem PostGIS/pg_trgm
DO $$ BEGIN ALTER TABLE "profile" ADD COLUMN "search_tsv" tsvector; EXCEPTION WHEN OTHERS THEN BEGIN ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "search_tsv" text; EXCEPTION WHEN duplicate_column THEN NULL; END; END $$;

-- GIN — tolerante (falha silenciosa se operador não existir)
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_search_tsv_idx" ON "profile" USING GIN ("search_tsv"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_name_trgm_idx" ON "profile" USING GIN ("name" gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_description_trgm_idx" ON "profile" USING GIN ("description" gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Trigger: mantém search_tsv = tsvector(name || tagline || description) em pt
CREATE OR REPLACE FUNCTION profile_search_tsv_trigger() RETURNS trigger AS $func$
BEGIN
  NEW.search_tsv := to_tsvector('portuguese', coalesce(NEW.name,'') || ' ' || coalesce(NEW.tagline,'') || ' ' || coalesce(NEW.description,''));
  RETURN NEW;
END
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profile_search_tsv_update ON "profile";
CREATE TRIGGER profile_search_tsv_update BEFORE INSERT OR UPDATE OF name, tagline, description ON "profile"
FOR EACH ROW EXECUTE FUNCTION profile_search_tsv_trigger();

-- Backfill existentes
UPDATE "profile" SET search_tsv = to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(tagline,'') || ' ' || coalesce(description,''))
WHERE search_tsv IS NULL;

-- Trigger geom: tenta geography, ignora se PostGIS não existir
DO $outer$ BEGIN
CREATE OR REPLACE FUNCTION profile_geom_trigger() RETURNS trigger AS $func$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END
$func$ LANGUAGE plpgsql;
EXCEPTION WHEN OTHERS THEN NULL;
END $outer$;

DROP TRIGGER IF EXISTS profile_geom_update ON "profile";
DO $$ BEGIN CREATE TRIGGER profile_geom_update BEFORE INSERT OR UPDATE OF latitude, longitude ON "profile" FOR EACH ROW EXECUTE FUNCTION profile_geom_trigger(); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Backfill geom — tolerante
DO $$ BEGIN UPDATE "profile" SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND geom IS NULL; EXCEPTION WHEN OTHERS THEN NULL; END $$;
