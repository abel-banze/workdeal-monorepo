// Aplica um ficheiro SQL de migração statement a statement, com log por
// statement — para quando o `drizzle-kit migrate` falha sem mostrar o erro.
//
// Uso (a partir da raiz do repo):
//   pnpm --filter @workdeal/db exec tsx scripts/apply-sql.ts drizzle/0039_dry_captain_stacy.sql
//
// Depois de aplicar manualmente, regista a migração no journal do drizzle
// para o `migrate` não tentar reaplicá-la:
//   SELECT max(id) FROM drizzle.__drizzle_migrations;
//   INSERT INTO drizzle.__drizzle_migrations(hash, created_at)
//   VALUES (39, round(extract(epoch from now()) * 1000));
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const file = process.argv[2];
if (!file) {
  console.error("Uso: tsx scripts/apply-sql.ts <ficheiro.sql>");
  process.exit(2);
}

const sqlText = readFileSync(path.resolve(process.cwd(), file), "utf8");
const statements = sqlText
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const { db } = await import("../src/client.js");
const { sql } = await import("drizzle-orm");

let i = 0;
for (const st of statements) {
  i++;
  const preview = st.replace(/\s+/g, " ").slice(0, 120);
  try {
    await db.execute(sql.raw(st));
    console.log(`[${i}/${statements.length}] OK: ${preview}`);
  } catch (e) {
    console.error(`[${i}/${statements.length}] FALHOU: ${preview}`);
    console.error(e);
    process.exit(1);
  }
}
console.log(`Migração aplicada (${statements.length} statements).`);
