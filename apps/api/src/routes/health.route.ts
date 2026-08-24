import { Hono } from "hono";
import { db } from "@workdeal/db";
import { sql } from "drizzle-orm";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch {
    dbOk = false;
  }
  const status = dbOk ? 200 : 503;
  return c.json({ success: dbOk, data: { status: dbOk ? "ok" : "degraded", db: dbOk ? "up" : "down" } }, status);
});

healthRoute.get("/full", async (c) => {
  const started = Date.now();
  const result: Record<string, unknown> = { startedAt: new Date().toISOString() };
  // 1. Conexão
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1 as ping`);
    result.connection = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    result.connection = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
    return c.json({ success: false, data: result }, 503);
  }
  // 2. Leitura
  try {
    const t0 = Date.now();
    const rows = await db.execute(sql`SELECT id, slug FROM category LIMIT 1`);
    result.read = { ok: true, ms: Date.now() - t0, sample: (rows as unknown as { rows?: unknown[] })?.rows?.length ?? 1 };
  } catch (e) {
    result.read = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
  }
  // 3. Escrita (transação que faz rollback — não suja dados)
  try {
    const t0 = Date.now();
    await db.execute(sql`BEGIN`);
    await db.execute(sql`CREATE TEMP TABLE IF NOT EXISTS _workdeal_health_write_test (id text PRIMARY KEY, v int) ON COMMIT DROP`);
    await db.execute(sql`INSERT INTO _workdeal_health_write_test (id, v) VALUES ('health-${Date.now()}', 1) ON CONFLICT DO NOTHING`);
    await db.execute(sql`ROLLBACK`);
    result.write = { ok: true, ms: Date.now() - t0 };
  } catch (e) {
    try { await db.execute(sql`ROLLBACK`); } catch {}
    result.write = { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : String(e) };
  }
  result.totalMs = Date.now() - started;
  const allOk = (result.connection as { ok?: boolean })?.ok && (result.read as { ok?: boolean })?.ok && (result.write as { ok?: boolean })?.ok;
  return c.json({ success: !!allOk, data: result }, allOk ? 200 : 503);
});
