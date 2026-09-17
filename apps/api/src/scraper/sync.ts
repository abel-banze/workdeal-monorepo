import { fetchDetails, fetchList } from "./fetch.js";
import { parseDetails } from "./parse-details.js";
import { parseList } from "./parse-list.js";
import { listReferencesWithoutDetails, saveDetails, upsertTender } from "./db.js";
import { notifyError, notifyNewTenders } from "./notify.js";
import { sleep } from "./sanitize.js";

export async function runSync(): Promise<{ total: number; newCount: number }> {
  const html = await fetchList("open");
  const tenders = parseList(html);

  if (tenders.length === 0) {
    await notifyError("UFSA scraper devolveu 0 concursos");
    return { total: 0, newCount: 0 };
  }

  const references: string[] = [];

  for (const item of tenders) {
    await upsertTender(item);
    references.push(item.reference);
  }

  const pending = await listReferencesWithoutDetails(references);

  for (const reference of pending) {
    try {
      const detailsHtml = await fetchDetails(reference);
      const details = parseDetails(detailsHtml, reference);
      await saveDetails(reference, details);
      await sleep(400);
    } catch (error) {
      console.error(`Falha nos detalhes de ${reference}`, error);
    }
  }

  if (pending.length > 0) {
    await notifyNewTenders(pending.length);
  }

  return { total: tenders.length, newCount: pending.length };
}