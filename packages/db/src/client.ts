import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@workdeal/shared/lib/env";
import * as schema from "./schema.js";

// Lazy — evita throw no import/build quando Root Directory = apps/api e env ainda não foi validado
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  _pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    // Fail-fast: sem isto, uma query presa (ex.: PgBouncer em fila) pendura o
    // request até ao timeout da Vercel (300s de 504) sem nenhum erro nos logs
    statement_timeout: 10_000,
    query_timeout: 10_000,
  });
  _pool.on("error", (err) => {
    console.error("[db] Pool error:", err.message);
  });
  return _pool;
}
function getDb(): ReturnType<typeof drizzle> {
  if (_db) return _db;
  _db = drizzle(getPool(), { schema });
  return _db;
}

// Proxy mantém compatibilidade `import { db, pool } from "@workdeal/db"` sem mudar call-sites
export const pool: Pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const p = getPool();
    const v = (p as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof v === "function" ? (v as Function).bind(p) : v;
  },
});

export const db: ReturnType<typeof drizzle> = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_t, prop) {
    const d = getDb();
    const v = (d as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof v === "function" ? (v as Function).bind(d) : v;
  },
});
