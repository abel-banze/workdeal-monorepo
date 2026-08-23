import { Client } from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const DEFAULT_DB = "workdeal";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida. Cria um ficheiro .env na raiz do monorepo (ver .env.example).");
    process.exit(1);
  }

  const target = new URL(url);
  const database = target.pathname.replace(/^\/+/, "") || DEFAULT_DB;

  const base = new URL(url);
  base.pathname = "/postgres";
  base.search = "";

  const admin = new Client({ connectionString: base.toString() });
  await admin.connect();

  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (exists.rowCount && exists.rowCount > 0) {
    console.log(`Database "${database}" já existe.`);
  } else {
    const encoded = database.replace(/'/g, "''");
    await admin.query(`CREATE DATABASE "${encoded}"`);
    console.log(`Database "${database}" criada.`);
  }

  await admin.end();
}

main().catch((err) => {
  console.error("Falha ao criar a database:", err);
  process.exit(1);
});
