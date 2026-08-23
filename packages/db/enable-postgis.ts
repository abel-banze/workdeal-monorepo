import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { db } = await import("./src/client.js");
const { sql } = await import("drizzle-orm");
try {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
  console.log("postgis enabled");
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  console.log("pg_trgm enabled");
  const ext = await db.execute(sql`SELECT extname FROM pg_extension WHERE extname IN ('postgis','pg_trgm')`);
  console.log(ext.rows);
} catch (e) { console.error(e); }
