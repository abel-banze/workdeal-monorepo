-- 0029: tsvector GENERATED STORED + pesos + unaccent + GIN, e trigram unaccent(nome)
-- Pesos: nome A, categoria+province/district/bairro B, description C
-- Dicionário portuguese + unaccent
-- Estratégia: denormaliza categoria/location em colunas da própria linha (GENERATED não pode ter subquery)

DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS unaccent; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Remove trigger/índices antigos idempotente
DO $$ BEGIN DROP TRIGGER IF EXISTS profile_search_tsv_update ON "profile"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP FUNCTION IF EXISTS profile_search_tsv_trigger() CASCADE; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP INDEX IF EXISTS "profile_search_tsv_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN DROP INDEX IF EXISTS "profile_search_tsv_gin_idx"; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 1) Colunas denormalizadas (permitem GENERATED sem subquery)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_category_text') THEN
    ALTER TABLE "profile" ADD COLUMN "search_category_text" text NOT NULL DEFAULT '';
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_location_text') THEN
    ALTER TABLE "profile" ADD COLUMN "search_location_text" text NOT NULL DEFAULT '';
  END IF;
END $$;
--> statement-breakpoint
-- 2) Recria search_tsv como GENERATED STORED (só se ainda não for GENERATED)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='NEVER') THEN
    ALTER TABLE "profile" DROP COLUMN "search_tsv";
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv') THEN
    ALTER TABLE "profile" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('portuguese', unaccent(coalesce("name", ''))), 'A') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce("tagline", '') || ' ' || coalesce("search_category_text", '') || ' ' || coalesce("search_location_text", ''))), 'B') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce("description", ''))), 'C')
    ) STORED;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '0029 GENERATED falhou, fallback para tsvector normal: %', SQLERRM;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv') THEN
      ALTER TABLE "profile" ADD COLUMN "search_tsv" tsvector;
    ELSE
      -- garante tipo tsvector se era text
      BEGIN
        ALTER TABLE "profile" ALTER COLUMN "search_tsv" TYPE tsvector USING to_tsvector('portuguese', unaccent(coalesce("name",'') || ' ' || coalesce("description",'')));
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END;
END $$;
--> statement-breakpoint
-- 3) Trigger fallback quando GENERATED não existe (mantém pesos)
CREATE OR REPLACE FUNCTION profile_search_sync_trigger() RETURNS trigger AS $func$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='ALWAYS') THEN
    RETURN NEW;
  END IF;
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.tagline,'') || ' ' || coalesce(NEW.search_category_text,'') || ' ' || coalesce(NEW.search_location_text,''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.description, ''))), 'C');
  RETURN NEW;
END
$func$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_search_sync ON "profile";
--> statement-breakpoint
CREATE TRIGGER profile_search_sync BEFORE INSERT OR UPDATE OF name, description, tagline, search_category_text, search_location_text ON "profile"
FOR EACH ROW EXECUTE FUNCTION profile_search_sync_trigger();
--> statement-breakpoint
-- 4) Triggers para denormalizar categoria e localização
CREATE OR REPLACE FUNCTION profile_category_search_sync() RETURNS trigger AS $func$
BEGIN
  UPDATE "profile" SET search_category_text = (
    SELECT coalesce(string_agg(c.name, ' '), '')
    FROM profile_category pc JOIN category c ON c.id = pc.category_id
    WHERE pc.profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
  ) WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN NULL;
END $func$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_category_search_sync_ins ON profile_category;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_category_search_sync_del ON profile_category;
--> statement-breakpoint
CREATE TRIGGER profile_category_search_sync_ins AFTER INSERT OR UPDATE ON profile_category FOR EACH ROW EXECUTE FUNCTION profile_category_search_sync();
--> statement-breakpoint
CREATE TRIGGER profile_category_search_sync_del AFTER DELETE ON profile_category FOR EACH ROW EXECUTE FUNCTION profile_category_search_sync();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION profile_location_search_sync() RETURNS trigger AS $func$
BEGIN
  UPDATE "profile" SET search_location_text = (
    SELECT coalesce(string_agg(province || ' ' || coalesce(district,'') || ' ' || coalesce(bairro,''), ' '), '')
    FROM profile_location WHERE profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
  ) WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN NULL;
END $func$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_location_search_sync_ins ON profile_location;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_location_search_sync_del ON profile_location;
--> statement-breakpoint
CREATE TRIGGER profile_location_search_sync_ins AFTER INSERT OR UPDATE OF province, district, bairro ON profile_location FOR EACH ROW EXECUTE FUNCTION profile_location_search_sync();
--> statement-breakpoint
CREATE TRIGGER profile_location_search_sync_del AFTER DELETE ON profile_location FOR EACH ROW EXECUTE FUNCTION profile_location_search_sync();
--> statement-breakpoint
-- 5) Backfill denormalizados
UPDATE "profile" SET search_category_text = coalesce(sub.cat_text,'') FROM (SELECT pc.profile_id, string_agg(c.name, ' ') AS cat_text FROM profile_category pc JOIN category c ON c.id=pc.category_id GROUP BY pc.profile_id) sub WHERE sub.profile_id = "profile".id;
--> statement-breakpoint
UPDATE "profile" SET search_location_text = coalesce(sub.loc_text,'') FROM (SELECT profile_id, string_agg(province || ' ' || coalesce(district,'') || ' ' || coalesce(bairro,''), ' ') AS loc_text FROM profile_location GROUP BY profile_id) sub WHERE sub.profile_id = "profile".id;
--> statement-breakpoint
-- 6) Se fallback (não GENERATED), força recomputação
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='ALWAYS') THEN
    UPDATE "profile" SET search_tsv =
      setweight(to_tsvector('portuguese', unaccent(coalesce(name,''))), 'A') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce(tagline,'') || ' ' || coalesce(search_category_text,'') || ' ' || coalesce(search_location_text,''))), 'B') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce(description,''))), 'C');
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE '0029 backfill fallback falhou: %', SQLERRM;
END $$;
--> statement-breakpoint
-- 7) Índices
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_search_tsv_gin_idx" ON "profile" USING GIN (search_tsv); EXCEPTION WHEN OTHERS THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_name_unaccent_trgm_idx" ON "profile" USING GIN (unaccent("name") gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_name_trgm_idx" ON "profile" USING GIN ("name" gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_slug_trgm_idx" ON "profile" USING GIN ("slug" gin_trgm_ops); EXCEPTION WHEN OTHERS THEN NULL; END $$;
