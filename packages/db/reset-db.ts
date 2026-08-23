import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import pg from "pg";
const url = process.env.DATABASE_URL!;
console.log("Resetting DB:", url.replace(/:[^:@]+@/, ":****@"));
const dbName = new URL(url.replace("postgres://", "http://")).pathname.slice(1) || "workdeal_monorepo";
const adminUrl = url.replace(`/${dbName}`, "/postgres");
console.log("Admin URL DB:", adminUrl.replace(/:[^:@]+@/, ":****@"), "target:", dbName);
const adminPool = new pg.Pool({ connectionString: adminUrl });
try {
  await adminPool.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  console.log(`Dropped ${dbName}`);
  await adminPool.query(`CREATE DATABASE "${dbName}"`);
  console.log(`Created ${dbName}`);
  await adminPool.end();
  // now migrate
  const { db } = await import("./src/client.js");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("migrate done");
  // seed
  const { seed } = await import("./src/seed.js");
  await seed();
  console.log("seed done");
} catch (e) {
  console.error(e);
} finally {
  process.exit(0);
}
