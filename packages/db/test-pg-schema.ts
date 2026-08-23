import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.resolve(__dirname, "./.env"), path.resolve(__dirname, "../../.env")]) {
  dotenv.config({ path: p, override: false });
}
console.log("PG_SCHEMA value:", JSON.stringify(process.env.PG_SCHEMA));
console.log("SCHEMA value:", JSON.stringify(process.env.SCHEMA));
console.log("DATABASE_URL value:", process.env.DATABASE_URL?.slice(0, 60));
console.log("All SCHEMA keys:", Object.entries(process.env).filter(([k])=>k.toLowerCase().includes("schema")).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join(", "));
