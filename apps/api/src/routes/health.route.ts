import { Hono } from "hono";
import { db } from "@workdeal/db";
import { sql } from "drizzle-orm";

function mask(v: string | undefined, show = 4): string {
  if (!v) return "∅ VAZIA";
  if (v.length <= show * 2) return `${v.slice(0, 1)}***${v.slice(-1)} (${v.length}ch)`;
  return `${v.slice(0, show)}...${v.slice(-show)} (${v.length}ch)`;
}
function parseDbUrl(raw: string | undefined): Record<string, unknown> {
  if (!raw) return { present: false, error: "DATABASE_URL vazia — Vercel Preview sem DB, define em Settings → Env → Preview (develop)" };
  try {
    const u = new URL(raw);
    const dbName = u.pathname.replace(/^\//, "") || "∅";
    const isPgbouncer = u.port === "6432";
    return {
      present: true,
      masked: mask(raw, 6),
      protocol: u.protocol,
      host: u.hostname,
      port: u.port || "5432",
      database: dbName,
      user: u.username || "∅",
      passwordLength: u.password ? `${u.password.length}ch` : "∅",
      isPgbouncer,
      search: u.search || "∅",
    };
  } catch (e) {
    return { present: true, masked: mask(raw, 6), error: `URL inválida: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function fullError(e: unknown): { message: string; code?: string; detail?: string; stack?: string; cause?: string } {
  if (e instanceof Error) {
    const cause = (e as unknown as { cause?: unknown }).cause;
    const code = (e as unknown as { code?: string }).code;
    const detail = (e as unknown as { detail?: string }).detail;
    return {
      message: e.message.slice(0, 800),
      code: typeof code === "string" ? code : undefined,
      detail: typeof detail === "string" ? detail.slice(0, 500) : undefined,
      cause: cause ? (cause instanceof Error ? `${cause.name}: ${cause.message}`.slice(0, 500) : String(cause).slice(0, 500)) : undefined,
      stack: e.stack?.split("\n").slice(0, 6).join(" | ").slice(0, 800),
    };
  }
  return { message: String(e).slice(0, 800) };
}

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  let dbOk = false;
  let error: ReturnType<typeof fullError> | undefined;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (e) {
    dbOk = false;
    error = fullError(e);
    console.error("[health/db] SELECT 1 failed:", JSON.stringify(error).slice(0, 2000));
  }
  const status = dbOk ? 200 : 503;
  return c.json({ success: dbOk, data: { status: dbOk ? "ok" : "degraded", db: dbOk ? "up" : "down", error, hint: dbOk ? undefined : "Verifica DATABASE_URL e firewall 6432/5432" } }, status);
});

healthRoute.get("/full", async (c) => {
  const started = Date.now();
  const rawDbUrl = process.env.DATABASE_URL;
  const dbInfo = parseDbUrl(rawDbUrl);
  const envInfo = {
    DATABASE_URL: dbInfo,
    BETTER_AUTH_URL: { value: process.env.BETTER_AUTH_URL ?? "∅ VAZIA", host: (() => { try { return new URL(process.env.BETTER_AUTH_URL ?? "").host; } catch { return "URL inválida"; } })(), masked: mask(process.env.BETTER_AUTH_URL) },
    BETTER_AUTH_SECRET: { present: !!process.env.BETTER_AUTH_SECRET, masked: mask(process.env.BETTER_AUTH_SECRET, 4) },
    ALLOWED_ORIGINS: { value: process.env.ALLOWED_ORIGINS ?? "∅ VAZIA", masked: mask(process.env.ALLOWED_ORIGINS, 8) },
    RESEND_API_KEY: { present: !!process.env.RESEND_API_KEY, masked: mask(process.env.RESEND_API_KEY, 4) },
    INTERNAL_API_SECRET: { present: !!process.env.INTERNAL_API_SECRET, masked: mask(process.env.INTERNAL_API_SECRET, 4) },
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_REGION: process.env.VERCEL_REGION ?? "∅",
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF,
  };

  const tests: Record<string, unknown> = {};

  // 1. Conexão
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1 as ping`);
    tests.connection = { ok: true, ms: Date.now() - t0, details: "TCP + Pool OK, SELECT 1 respondeu" };
  } catch (e) {
    const err = fullError(e);
    console.error("[health/db/full] connection failed:", JSON.stringify(err).slice(0, 2000), "dbInfo:", JSON.stringify(dbInfo).slice(0, 1000));
    let hint = "";
    const msg = err.message;
    if (/timeout/i.test(msg) || /timeout/i.test(err.cause ?? "") || /ETIMEDOUT/i.test(err.code ?? "")) hint = "Timeout 5s — firewall Hostinger/hPanel para 6432, ou pgbouncer listen_addr≠*, ou DB pausada. Testa nc -vz <host> 6432 de fora da tua rede.";
    else if (/password|auth|28P01|3D000/i.test(msg) || /password|auth/i.test(err.cause ?? "")) hint = "Auth falhou — verifica user/password (caracteres @ precisam %40) e se o user tem permissão na DB workdeal_sandbox.";
    else if (/ENOTFOUND|getaddrinfo|EAI_AGAIN/i.test(msg) || /ENOTFOUND/i.test(err.cause ?? "")) hint = "Host não resolvido — verifica hostname do DATABASE_URL.";
    else if (/refused|ECONNREFUSED/i.test(msg) || /refused/i.test(err.cause ?? "")) hint = "Conexão recusada — pgbouncer/Postgres não escuta em 0.0.0.0:6432, verifica ss -tlnp e listen_addr=*";
    tests.connection = { ok: false, error: err.message, code: err.code, cause: err.cause, detail: err.detail, stack: err.stack, hint };
    return c.json({ success: false, data: { startedAt: new Date(started).toISOString(), env: envInfo, tests, totalMs: Date.now() - started, summary: { allOk: false, cause: hint || msg.slice(0, 300) } } }, 503);
  }

  // 2. Leitura
  try {
    const t0 = Date.now();
    const res: unknown = await db.execute(sql`SELECT id, slug FROM category LIMIT 1`);
    const rows = (res as { rows?: unknown[] })?.rows ?? (Array.isArray(res) ? res : []);
    tests.read = { ok: true, ms: Date.now() - t0, rowCount: Array.isArray(rows) ? rows.length : 1, details: "SELECT em category OK" };
  } catch (e) {
    const err = fullError(e);
    tests.read = { ok: false, error: err.message, code: err.code, cause: err.cause, hint: "Leitura falhou — verifica permissões SELECT e se a tabela category existe." };
  }

  // 3. Escrita (rollback — não suja dados)
  try {
    const t0 = Date.now();
    await db.execute(sql`BEGIN`);
    await db.execute(sql`CREATE TEMP TABLE IF NOT EXISTS _workdeal_health_write_test (id text PRIMARY KEY, v int) ON COMMIT DROP`);
    const tid = `health-${Date.now()}`;
    await db.execute(sql`INSERT INTO _workdeal_health_write_test (id, v) VALUES (${tid}, 1) ON CONFLICT DO NOTHING`);
    await db.execute(sql`ROLLBACK`);
    tests.write = { ok: true, ms: Date.now() - t0, details: "BEGIN + CREATE TEMP + INSERT + ROLLBACK OK — permissão de escrita confirmada" };
  } catch (e) {
    try { await db.execute(sql`ROLLBACK`); } catch {}
    const err = fullError(e);
    tests.write = { ok: false, error: err.message, code: err.code, cause: err.cause, hint: "Escrita falhou — verifica permissão CREATE TEMP / INSERT ou se a DB está em modo read-only." };
  }

  const totalMs = Date.now() - started;
  const allOk = (tests.connection as { ok?: boolean })?.ok && (tests.read as { ok?: boolean })?.ok && (tests.write as { ok?: boolean })?.ok;
  let cause = "";
  if (!allOk) {
    if (!(tests.connection as { ok?: boolean })?.ok) cause = (tests.connection as { hint?: string })?.hint ?? "Falha de conexão";
    else if (!(tests.read as { ok?: boolean })?.ok) cause = (tests.read as { hint?: string })?.hint ?? "Falha de leitura";
    else if (!(tests.write as { ok?: boolean })?.ok) cause = (tests.write as { hint?: string })?.hint ?? "Falha de escrita";
  }
  return c.json({ success: !!allOk, data: { startedAt: new Date(started).toISOString(), env: envInfo, tests, totalMs, summary: { allOk: !!allOk, cause: cause || (allOk ? "Tudo OK" : "Verifica logs acima") } } }, allOk ? 200 : 503);
});
