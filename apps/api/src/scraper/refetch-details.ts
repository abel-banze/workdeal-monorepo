import { asc, eq } from "drizzle-orm";
import { db, tender } from "@workdeal/db";
import { fetchDetails } from "./fetch.js";
import { parseDetails } from "./parse-details.js";
import { saveDetails } from "./db.js";
import { sleep } from "./sanitize.js";

async function refetchDetails(): Promise<void> {
  const rows = await db
    .select({ reference: tender.reference })
    .from(tender)
    .where(eq(tender.detailsFetched, false))
    .orderBy(asc(tender.reference));

  console.log(`[refetch] ${rows.length} concurso(s) pendente(s)`);

  for (const row of rows) {
    try {
      const html = await fetchDetails(row.reference);
      const details = parseDetails(html, row.reference);
      await saveDetails(row.reference, details);
      console.log(`[refetch] OK ${row.reference}`);
    } catch (error) {
      console.error(`[refetch] falha em ${row.reference}`, error);
    }
    await sleep(500);
  }
}

refetchDetails().catch((error) => {
  console.error("Erro fatal no refetch:", error);
  process.exitCode = 1;
});