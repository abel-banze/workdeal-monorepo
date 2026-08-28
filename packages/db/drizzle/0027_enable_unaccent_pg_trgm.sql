-- 0027: unaccent + pg_trgm para FTS human-way
-- Idempotente, tolerante a ambientes sem permissão superuser
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS unaccent; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'unaccent indisponível: %', SQLERRM; END $$;
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS pg_trgm; EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_trgm indisponível: %', SQLERRM; END $$;
