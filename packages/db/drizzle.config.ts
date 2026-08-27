import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Per-project: apps/api é a fonte de DATABASE_URL em prod (Vercel Root = apps/api)
// Em dev, tenta apps/api/.env > packages/db/.env > raiz (compat), sem sobrescrever
for (const p of [
  path.resolve(__dirname, "./.env"),
  path.resolve(__dirname, "../../apps/api/.env"),
  path.resolve(__dirname, "../../apps/api/.env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), "packages/db/.env"),
]) {
  dotenv.config({ path: p, override: false });
}

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/workdeeal_monorepo";
if (!url || url.includes("undefined")) {
  throw new Error(`DATABASE_URL inválida para drizzle-kit push: "${url}". Verifica packages/db/.env ou .env na raiz (deve ser postgres://postgres:****@localhost:5432/workdeeal_monorepo).`);
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  verbose: true,
  strict: false,
  extensionsFilters: ["postgis"],
  schemaFilter: ["public"],
  tablesFilter: ["*"]
  // PostGIS é habilitado via migração SQL (CREATE EXTENSION IF NOT EXISTS postgis)
});
