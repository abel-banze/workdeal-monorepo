import * as cheerio from "cheerio";
import type { TenderListItem } from "./types.js";
import { parseListDate, sanitize } from "./sanitize.js";

export function parseList(html: string): TenderListItem[] {
  const $ = cheerio.load(html);
  const results: TenderListItem[] = [];

  $("table tr").each((_index, row) => {
    const cells = $(row).find("td");
    if (cells.length < 6) return;

    const link = $(cells[0]).find("a");
    const href = link.attr("href") ?? "";
    const match = href.match(/referencia=([^&]+)/);
    if (!match) return;

    const reference = decodeURIComponent(match[1] ?? "");
    const firstCellHtml = $(cells[0]).html() ?? "";
    const typeRaw = firstCellHtml.split("<br>")[0]?.replace(/<[^>]*>/g, "").trim() ?? "";

    const text = sanitize($(cells[1]).text());
    const colonIndex = text.indexOf(":");

    results.push({
      reference,
      type: typeRaw.replace(/:$/, ""),
      category: colonIndex >= 0 ? text.substring(0, colonIndex).trim() : text,
      object: colonIndex >= 0 ? text.substring(colonIndex + 1).trim() : "",
      ugea: sanitize($(cells[2]).text()),
      province: sanitize($(cells[3]).text()),
      launchedAt: parseListDate($(cells[4]).text()),
      openedAt: parseListDate($(cells[5]).text()),
      detailsUrl: `https://www.ufsa.gov.mz/concurso_detalhes.php?referencia=${encodeURIComponent(reference)}`,
    });
  });

  return results;
}