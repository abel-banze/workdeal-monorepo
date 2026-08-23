-- P0-7: Re-activar PostGIS (geography + GIST + backfill)
-- Garante que docker-compose postgis/postgis:16 esteja activo
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS postgis; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PostGIS indisponível'; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_trgm indisponível'; END $$;

-- profile.geom: assegura tipo geography(Point,4326)
DO $$ BEGIN
  -- Tenta converter coluna text → geography se necessário (quando 0002 caiu em fallback)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='geom' AND udt_name IN ('text', 'varchar')) THEN
    BEGIN
      ALTER TABLE "profile" ALTER COLUMN "geom" TYPE geography(Point, 4326) USING (
        CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography
        ELSE NULL END
      );
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'profile.geom conversão falhou: %', SQLERRM;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- profile_location.geom
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile_location' AND column_name='geom' AND udt_name IN ('text', 'varchar')) THEN
    BEGIN
      ALTER TABLE "profile_location" ALTER COLUMN "geom" TYPE geography(Point, 4326) USING (
        CASE WHEN "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        THEN ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326)::geography
        ELSE NULL END
      );
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'profile_location.geom conversão falhou: %', SQLERRM;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill geom onde lat/lng existem mas geom é NULL (idempotente)
DO $$ BEGIN
  UPDATE "profile" SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "geom" IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  UPDATE "profile_location" SET "geom" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
  WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL AND "geom" IS NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Índices GIST para ordenação por distância (ST_Distance)
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_geom_gist_idx" ON "profile" USING GIST ("geom"); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_location_geom_gist_idx" ON "profile_location" USING GIST ("geom"); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Verifica (não falha se não existir)
DO $$ BEGIN
  RAISE NOTICE 'P0-7 PostGIS reactivado: profile.geom=% profile_location.geom=%',
    (SELECT udt_name FROM information_schema.columns WHERE table_name='profile' AND column_name='geom'),
    (SELECT udt_name FROM information_schema.columns WHERE table_name='profile_location' AND column_name='geom');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
