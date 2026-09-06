-- 0032: tags/competências no tsvector de pesquisa
-- Denormaliza os nomes de tags em search_tag_text (GENERATED não pode ter
-- subquery) e inclui-os no search_tsv com peso B (mesmo nível das categorias
-- e localização) — "procuro empresa de energia solar" passa a encontrar
-- empresas cuja competência é "Energia Solar" mesmo sem a palavra no nome.

--> statement-breakpoint
-- 1) Coluna denormalizada (permitem GENERATED sem subquery)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tag_text') THEN
    ALTER TABLE "profile" ADD COLUMN "search_tag_text" text NOT NULL DEFAULT '';
  END IF;
END $$;
--> statement-breakpoint
-- 2) Recria search_tsv como GENERATED STORED incluindo search_tag_text
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='ALWAYS') THEN
    ALTER TABLE "profile" DROP COLUMN "search_tsv";
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv') THEN
    ALTER TABLE "profile" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('portuguese', unaccent(coalesce("name", ''))), 'A') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce("tagline", '') || ' ' || coalesce("search_category_text", '') || ' ' || coalesce("search_location_text", '') || ' ' || coalesce("search_tag_text", ''))), 'B') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce("description", ''))), 'C')
    ) STORED;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '0032 GENERATED falhou, fallback para tsvector normal: %', SQLERRM;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv') THEN
      ALTER TABLE "profile" ADD COLUMN "search_tsv" tsvector;
    ELSE
      BEGIN
        ALTER TABLE "profile" ALTER COLUMN "search_tsv" TYPE tsvector USING to_tsvector('portuguese', unaccent(coalesce("name",'') || ' ' || coalesce("description",'')));
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END;
END $$;
--> statement-breakpoint
-- 3) Trigger fallback atualizado (mantém pesos + tags quando não é GENERATED)
CREATE OR REPLACE FUNCTION profile_search_sync_trigger() RETURNS trigger AS $func$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='ALWAYS') THEN
    RETURN NEW;
  END IF;
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.name, ''))), 'A') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.tagline,'') || ' ' || coalesce(NEW.search_category_text,'') || ' ' || coalesce(NEW.search_location_text,'') || ' ' || coalesce(NEW.search_tag_text,''))), 'B') ||
    setweight(to_tsvector('portuguese', unaccent(coalesce(NEW.description, ''))), 'C');
  RETURN NEW;
END
$func$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_search_sync ON "profile";
--> statement-breakpoint
CREATE TRIGGER profile_search_sync BEFORE INSERT OR UPDATE OF name, description, tagline, search_category_text, search_location_text, search_tag_text ON "profile"
FOR EACH ROW EXECUTE FUNCTION profile_search_sync_trigger();
--> statement-breakpoint
-- 4) Trigger para denormalizar tags (espelho de profile_category_search_sync)
CREATE OR REPLACE FUNCTION profile_tag_search_sync() RETURNS trigger AS $func$
BEGIN
  UPDATE "profile" SET search_tag_text = (
    SELECT coalesce(string_agg(t.name, ' '), '')
    FROM profile_tag pt JOIN tag t ON t.id = pt.tag_id
    WHERE pt.profile_id = COALESCE(NEW.profile_id, OLD.profile_id)
  ) WHERE id = COALESCE(NEW.profile_id, OLD.profile_id);
  RETURN NULL;
END $func$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_tag_search_sync_ins ON profile_tag;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_tag_search_sync_del ON profile_tag;
--> statement-breakpoint
CREATE TRIGGER profile_tag_search_sync_ins AFTER INSERT OR UPDATE ON profile_tag FOR EACH ROW EXECUTE FUNCTION profile_tag_search_sync();
--> statement-breakpoint
CREATE TRIGGER profile_tag_search_sync_del AFTER DELETE ON profile_tag FOR EACH ROW EXECUTE FUNCTION profile_tag_search_sync();
--> statement-breakpoint
-- 5) Backfill denormalizado
UPDATE "profile" SET search_tag_text = coalesce(sub.tag_text,'') FROM (
  SELECT pt.profile_id, string_agg(t.name, ' ') AS tag_text
  FROM profile_tag pt JOIN tag t ON t.id = pt.tag_id
  GROUP BY pt.profile_id
) sub WHERE sub.profile_id = "profile".id;
--> statement-breakpoint
-- 6) Se fallback (não GENERATED), força recomputação com tags
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profile' AND column_name='search_tsv' AND is_generated='ALWAYS') THEN
    UPDATE "profile" SET search_tsv =
      setweight(to_tsvector('portuguese', unaccent(coalesce(name,''))), 'A') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce(tagline,'') || ' ' || coalesce(search_category_text,'') || ' ' || coalesce(search_location_text,'') || ' ' || coalesce(search_tag_text,''))), 'B') ||
      setweight(to_tsvector('portuguese', unaccent(coalesce(description,''))), 'C');
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE '0032 backfill fallback falhou: %', SQLERRM;
END $$;
--> statement-breakpoint
-- 7) Índice GIN (a coluna foi dropada/recriada, índice precisa de voltar)
DO $$ BEGIN CREATE INDEX IF NOT EXISTS "profile_search_tsv_gin_idx" ON "profile" USING GIN (search_tsv); EXCEPTION WHEN OTHERS THEN NULL; END $$;