import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const { pool } = await import("./src/client.js");
try {
  await pool.query(`DROP INDEX IF EXISTS "profile_geom_gist_idx"`);
  console.log("dropped profile_geom_gist_idx");
  await pool.query(`DROP INDEX IF EXISTS "profile_location_geom_gist_idx"`);
  console.log("dropped profile_location_geom_gist_idx");
  await pool.query(`DROP INDEX IF EXISTS "profile_geo_idx"`);
  console.log("dropped profile_geo_idx if exists");
  // Check current type
  const r = await pool.query(`SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='profile' AND column_name='geom'`);
  console.log("profile.geom type:", r.rows);
  const r2 = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename='profile' AND indexdef LIKE '%geom%'`);
  console.log("profile geom indexes:", r2.rows);
  // Try to alter to text with USING
  try {
    await pool.query(`ALTER TABLE "profile" ALTER COLUMN "geom" TYPE text USING "geom"::text`);
    console.log("altered profile.geom to text");
  } catch (e) { console.log("alter profile geom failed", (e as Error).message.slice(0, 300)); }
  try {
    await pool.query(`ALTER TABLE "profile_location" ALTER COLUMN "geom" TYPE text USING "geom"::text`);
    console.log("altered profile_location.geom to text");
  } catch (e) { console.log("alter profile_location geom failed", (e as Error).message.slice(0, 300)); }
  const r3 = await pool.query(`SELECT column_name, udt_name FROM information_schema.columns WHERE table_name='profile' AND column_name='geom'`);
  console.log("after profile.geom type:", r3.rows);
} catch (e) { console.error(e); }
process.exit(0);
