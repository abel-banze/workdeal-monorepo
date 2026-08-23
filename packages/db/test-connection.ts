import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "./.env") });
console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@")?.slice(0, 80));
const { db } = await import("./src/client.js");
const { sql } = await import("drizzle-orm");
try {
  const r = await db.execute(sql`SELECT 1 as ok`);
  console.log("DB ok", r);
  const ext = await db.execute(sql`SELECT extname FROM pg_extension WHERE extname='postgis'`);
  console.log("postgis", ext.rows);
  const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 5`);
  console.log("tables", tables.rows);
} catch (e) {
  console.error("DB error", e);
}
