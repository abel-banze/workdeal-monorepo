import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.resolve(__dirname, "./.env"), path.resolve(__dirname, "../../.env"), path.resolve(__dirname, "../../.env.local")]) {
  const r = dotenv.config({ path: p, override: false });
  console.log(p, r.error ? "no" : "yes", Object.keys(process.env).filter(k=>k.includes("DATABASE")||k.includes("SCHEMA")).join(","));
}
console.log("DATABASE_URL", process.env.DATABASE_URL?.slice(0, 50));
console.log("PG_SCHEMA", process.env.PG_SCHEMA);
console.log("SCHEMA", process.env.SCHEMA);
