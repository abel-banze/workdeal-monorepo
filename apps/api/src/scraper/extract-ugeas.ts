import { writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db, tender, ugea } from "@workdeal/db";
import { runSync } from "./sync.js";
import { sleep } from "./sanitize.js";

const BACKOFFS = [2000, 4000, 6000];

async function tryRunSync(): Promise<{ total: number; newCount: number }> {
  let lastError: unknown;
  for (const backoff of BACKOFFS) {
    try {
      return await runSync();
    } catch (error) {
      lastError = error;
      console.error(`[extract-ugeas] scraper falhou; retry em ${backoff}ms`, error);
      await sleep(backoff);
    }
  }
  throw lastError;
}

async function exportUniqueUgeas(): Promise<void> {
  const rows = await db
    .selectDistinct({ id: ugea.id, name: ugea.name, slug: ugea.slug })
    .from(tender)
    .innerJoin(ugea, eq(tender.ugeaId, ugea.id))
    .orderBy(asc(ugea.name));

  await writeFile(path.resolve(process.cwd(), "ugeas.json"), JSON.stringify(rows, null, 2) + "\n", "utf8");
  console.log(`[extract-ugeas] exportou ${rows.length} UGEAs únicas`);

  if (rows.length === 0) {
    console.warn("[extract-ugeas] nenhuma UGEA encontrada após a sincronização");
  }
}

async function main(): Promise<void> {
  try {
    const result = await tryRunSync();
    console.log(`[extract-ugeas] sync OK — total=${result.total} novos=${result.newCount}`);
  } catch (error) {
    console.error("[extract-ugeas] scraper falhou após todos os retries; a exportar UGEAs da BD existente", error);
  }

  try {
    await exportUniqueUgeas();
  } catch (error) {
    console.error("[extract-ugeas] falha na exportação", error);
    process.exitCode = 1;
  }
}

void main();