import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "./.env") });
const { db } = await import("./src/client.js");
const { migrate } = await import("drizzle-orm/node-postgres/migrator");
try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("migrate done");
} catch (e) {
  console.error("migrate error", e);
  if (e instanceof Error) console.error(e.stack);
}
process.exit(0);
