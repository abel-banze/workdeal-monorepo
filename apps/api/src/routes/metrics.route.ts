import { Hono } from "hono";
import { db, quoteRequest } from "@workdeal/db";
import { sql, gte } from "drizzle-orm";
import { ok } from "../lib/api-response.js";

export const metricsRoute = new Hono();

metricsRoute.get("/north-star", async (c) => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quoteRequest)
      .where(gte(quoteRequest.createdAt, weekAgo));
    const conexoesSemana = row?.count ?? 0;
    // BRD §3.2 North Star: conexões/semana (pedidos de cotação + contactos directos)
    // Por agora só cotações (views virão via PostHog P2-6 futuro)
    return c.json(ok({ conexoesSemana, period: "7d", at: new Date().toISOString() }), 200);
  } catch {
    return c.json(ok({ conexoesSemana: 0, period: "7d", at: new Date().toISOString() }), 200);
  }
});
