import { and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { db, tender, tenderDocument, ugea } from "@workdeal/db";
import type { TenderListQuery } from "@workdeal/shared";

export type TenderListResult = {
  items: TenderRow[];
  total: number;
};

export type TenderRow = {
  id: string;
  source: (typeof tender.source.enumValues)[number];
  reference: string;
  ugeaId: string | null;
  ugeaSlug: string | null;
  type: string | null;
  category: string | null;
  object: string | null;
  province: string | null;
  launchedAt: Date | null;
  openedAt: Date | null;
  detailsUrl: string | null;
  regime: string | null;
  modality: string | null;
  class: string | null;
  generalObject: string | null;
  currency: string | null;
  estimatedValue: string | null;
  provisionalGuarantee: string | null;
  awardCriteria: string | null;
  lotCount: string | null;
  proposalDelivery: string | null;
  deliveryTime: string | null;
  openingTime: string | null;
  observations: string | null;
  publishedAt: Date | null;
  description: string | null;
  status: (typeof tender.status.enumValues)[number];
  firstSeenAt: Date;
  lastSeenAt: Date;
  ugeaName: string | null;
};

export type TenderDocumentRow = {
  id: string;
  tenderId: string;
  type: string;
  name: string;
  url: string;
};

const TENDER_COLUMNS = {
  id: tender.id,
  source: tender.source,
  reference: tender.reference,
  ugeaId: tender.ugeaId,
  ugeaSlug: tender.ugeaSlug,
  type: tender.type,
  category: tender.category,
  object: tender.object,
  province: tender.province,
  launchedAt: tender.launchedAt,
  openedAt: tender.openedAt,
  detailsUrl: tender.detailsUrl,
  regime: tender.regime,
  modality: tender.modality,
  class: tender.class,
  generalObject: tender.generalObject,
  currency: tender.currency,
  estimatedValue: tender.estimatedValue,
  provisionalGuarantee: tender.provisionalGuarantee,
  awardCriteria: tender.awardCriteria,
  lotCount: tender.lotCount,
  proposalDelivery: tender.proposalDelivery,
  deliveryTime: tender.deliveryTime,
  openingTime: tender.openingTime,
  observations: tender.observations,
  publishedAt: tender.publishedAt,
  description: tender.description,
  status: tender.status,
  firstSeenAt: tender.firstSeenAt,
  lastSeenAt: tender.lastSeenAt,
};

async function fetchDocuments(tenderIds: string[]): Promise<Map<string, TenderDocumentRow[]>> {
  if (tenderIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: tenderDocument.id,
      tenderId: tenderDocument.tenderId,
      type: tenderDocument.type,
      name: tenderDocument.name,
      url: tenderDocument.url,
    })
    .from(tenderDocument)
    .where(inArray(tenderDocument.tenderId, tenderIds));

  const map = new Map<string, TenderDocumentRow[]>();
  for (const row of rows) {
    const list = map.get(row.tenderId) ?? [];
    list.push(row);
    map.set(row.tenderId, list);
  }
  return map;
}

export const tendersRepository = {
  async list(query: TenderListQuery): Promise<TenderListResult> {
    const { q, province, category, page = 1, limit = 20 } = query;

    const conds: SQL[] = [eq(tender.status, "published")];
    if (q) {
      conds.push(
        or(
          ilike(tender.object, `%${q}%`),
          ilike(tender.generalObject, `%${q}%`),
          ilike(tender.category, `%${q}%`),
          ilike(tender.ugeaSlug, `%${q}%`),
        )!,
      );
    }
    if (province) conds.push(eq(tender.province, province));
    if (category) conds.push(eq(tender.category, category));
    const where = and(...conds);

    const totalRow = await db.select({ n: count(tender.id) }).from(tender).where(where);
    const total = totalRow[0]?.n ?? 0;

    const rows = await db
      .select({ ...TENDER_COLUMNS, ugeaName: ugea.name })
      .from(tender)
      .leftJoin(ugea, eq(tender.ugeaId, ugea.id))
      .where(where)
      .orderBy(desc(tender.publishedAt), desc(tender.firstSeenAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return { items: rows, total };
  },

  async findByIdOrReference(idOrReference: string): Promise<TenderRow | null> {
    const row = await db
      .select({ ...TENDER_COLUMNS, ugeaName: ugea.name })
      .from(tender)
      .leftJoin(ugea, eq(tender.ugeaId, ugea.id))
      .where(and(eq(tender.status, "published"), or(eq(tender.id, idOrReference), eq(tender.reference, idOrReference))))
      .limit(1);

    return row[0] ?? null;
  },

  async documentsFor(tenderId: string): Promise<TenderDocumentRow[]> {
    const map = await fetchDocuments([tenderId]);
    return map.get(tenderId) ?? [];
  },
};