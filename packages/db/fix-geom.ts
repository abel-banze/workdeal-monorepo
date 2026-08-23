import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { db } = await import("./src/client.js");
const { sql } = await import("drizzle-orm");
try {
  await db.execute(sql`DROP INDEX IF EXISTS "profile_geom_gist_idx"`);
  console.log("dropped profile_geom_gist_idx");
  await db.execute(sql`DROP INDEX IF EXISTS "profile_location_geom_gist_idx"`);
  console.log("dropped profile_location_geom_gist_idx");
  // Try to alter geom to text if it's geography — will fail if already text, so ignore
  try {
    await db.execute(sql`ALTER TABLE "profile" ALTER COLUMN "geom" TYPE text USING "geom"::text`);
    console.log("altered profile.geom to text");
  } catch (e) { console.log("profile geom alter to text failed or already text", (e as Error).message.slice(0, 200)); }
  try {
    await db.execute(sql`ALTER TABLE "profile_location" ALTER COLUMN "geom" TYPE text USING "geom"::text`);
    console.log("altered profile_location.geom to text");
  } catch (e) { console.log("profile_location geom alter failed", (e as Error).message.slice(0, 200)); }
  const r = await db.execute(sql`SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='profile' AND column_name='geom'`);
  console.log(r.rows);
} catch (e) { console.error(e); }
process.exit(0);
