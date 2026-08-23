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
