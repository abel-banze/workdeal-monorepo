import * as cheerio from "cheerio";
import type { TenderDetails } from "./types.js";
import { parseDetailsDate, parseMoney, sanitize } from "./sanitize.js";

function extractDocumentUrl($: cheerio.CheerioAPI, type: "notice" | "document"): string | null {
  const parameter = type === "notice" ? "Baixar_anuncio" : "Baixar_cad_enc";
  const href = $(`a[href*="${parameter}"]`).attr("href");
  if (!href) return null;

  return `https://www.ufsa.gov.mz/${href.replace(/^\.?\//, "")}`;
}

export function parseDetails(html: string, _reference: string): TenderDetails {
  const $ = cheerio.load(html);
  const fields = new Map<string, string>();

  $("#lista tr").each((_index, row) => {
    const cells = $(row).children("th, td");
    if (cells.length < 3 || !cells.eq(1).is("th")) return;

    const label = cells.eq(1).text().trim().replace(/:$/, "").toLowerCase();
    if (label) fields.set(label, cells.eq(2).text().trim());
  });

  const textField = (label: string) => (fields.has(label) ? sanitize(fields.get(label)!) : null);
  const moneyField = (label: string) => (fields.has(label) ? parseMoney(fields.get(label)!) : null);
  const dateField = (label: string) => (fields.has(label) ? parseDetailsDate(fields.get(label)!) : null);

  return {
    regime: textField("regime"),
    modality: textField("modalidade"),
    class: textField("classe"),
    generalObject: textField("objecto geral"),
    currency: textField("moeda"),
    estimatedValue: moneyField("valor estimado"),
    provisionalGuarantee: moneyField("garantia provisória"),
    awardCriteria: textField("criterio de adjudicacao"),
    lotCount: textField("numero de lotes"),
    proposalDelivery: textField("entrega de propostas"),
    deliveryTime: textField("hora de entrega"),
    openingTime: textField("hora de abertura"),
    observations: textField("observações"),
    publishedAt: dateField("data de publicação"),
    openedAt: dateField("data de abertura"),
    launchedAt: dateField("data de lancamento"),
    noticeUrl: extractDocumentUrl($, "notice"),
    documentUrl: extractDocumentUrl($, "document"),
  };
}