-- 0030: Materialized view known_locations derivada de profile_location
-- Dicionário dinâmico (sem hardcode) com unaccent+lowercase e trigram

DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS unaccent; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP MATERIALIZED VIEW IF EXISTS known_locations;
--> statement-breakpoint
CREATE MATERIALIZED VIEW known_locations AS
SELECT DISTINCT ON (kind, value_unaccent)
  kind,
  value,
  value_unaccent,
  province,
  district
FROM (
  -- bairro (neighborhood) com contexto province/district
  SELECT 'bairro'::text AS kind,
         bairro AS value,
         unaccent(lower(bairro)) AS value_unaccent,
         province, district
  FROM profile_location WHERE bairro IS NOT NULL AND bairro <> ''
  UNION
  -- district
  SELECT 'district'::text AS kind,
         district AS value,
         unaccent(lower(district)) AS value_unaccent,
         province, district
  FROM profile_location WHERE district IS NOT NULL AND district <> ''
  UNION
  -- province (city)
  SELECT 'province'::text AS kind,
         province AS value,
         unaccent(lower(province)) AS value_unaccent,
         province, NULL::text AS district
  FROM profile_location WHERE province IS NOT NULL AND province <> ''
) s
WHERE value_unaccent <> ''
ORDER BY kind, value_unaccent, value;
--> statement-breakpoint
-- Índice trigram para similaridade
DO $$ BEGIN CREATE INDEX IF NOT EXISTS known_locations_value_trgm_idx ON known_locations USING GIN (value_unaccent gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS known_locations_kind_value_idx ON known_locations (kind, value_unaccent);
--> statement-breakpoint
-- Índice para busca por province
CREATE INDEX IF NOT EXISTS known_locations_province_idx ON known_locations (province);
--> statement-breakpoint
-- Função helper para refresh (chamada após onboarding ou via cron)
CREATE OR REPLACE FUNCTION refresh_known_locations() RETURNS void AS $f$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY known_locations;
EXCEPTION WHEN OTHERS THEN
  REFRESH MATERIALIZED VIEW known_locations;
END $f$ LANGUAGE plpgsql;
