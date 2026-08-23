import "dotenv/config";
import { Client } from "pg";

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await c.query('ALTER TABLE "quote_request" ALTER COLUMN "requester_user_id" DROP NOT NULL');
  console.log("ALTER aplicado com sucesso");
} catch (e) {
  console.error("ERRO:", (e as Error).message);
} finally {
  await c.end();
}
