-- P2-1: tsvector + pg_trgm para pesquisa full-text (searchTsv)
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Converte search_tsv de text para tsvector se for text, senão garante tipo
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND udt_name IN ('text', 'varchar')) THEN
    BEGIN
      ALTER TABLE "profile" ALTER COLUMN "search_tsv" TYPE tsvector USING to_tsvector('portuguese', coalesce("name",'') || ' ' || coalesce("description",'') || ' ' || coalesce("slug",''));
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'search_tsv conversão falhou: %', SQLERRM;
    END;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Trigger para manter search_tsv actualizado em insert/update
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION profile_search_tsv_trigger() RETURNS trigger AS $f$
  BEGIN
    NEW.search_tsv := to_tsvector('portuguese', coalesce(NEW.name,'') || ' ' || coalesce(NEW.description,'') || ' ' || coalesce(NEW.slug,''));
    RETURN NEW;
  END $f$ LANGUAGE plpgsql;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS profile_search_tsv_update ON "profile";
  CREATE TRIGGER profile_search_tsv_update BEFORE INSERT OR UPDATE OF name, description, slug ON "profile"
  FOR EACH ROW EXECUTE FUNCTION profile_search_tsv_trigger();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Backfill
DO $$ BEGIN
  UPDATE "profile" SET search_tsv = to_tsvector('portuguese', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(slug,''));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Índices GIN para tsvector e GIN trigram para ilike fallback
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_search_tsv_gin_idx" ON "profile" USING GIN (search_tsv); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_name_trgm_idx" ON "profile" USING GIN (name gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_slug_trgm_idx" ON "profile" USING GIN (slug gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
