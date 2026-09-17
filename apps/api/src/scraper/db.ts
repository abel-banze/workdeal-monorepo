import { and, eq, inArray } from "drizzle-orm";
import { db, tender, tenderDocument, ugea } from "@workdeal/db";
import { generateSlug } from "./slug.js";
import type { TenderDetails, TenderListItem } from "./types.js";

export { generateSlug };

export async function getOrCreateUgea(name: string): Promise<{ id: string; slug: string } | null> {
  if (!name.trim()) return null;

  const normalized = name.trim();
  const slug = generateSlug(normalized);

  const inserted = await db
    .insert(ugea)
    .values({ name: normalized, slug })
    .onConflictDoNothing()
    .returning({ id: ugea.id, slug: ugea.slug });

  if (inserted[0]) return inserted[0];

  // Conflito (corrida/interferência) → reutiliza a UGEA existente pelo slug.
  const existing = await db
    .select({ id: ugea.id, slug: ugea.slug })
    .from(ugea)
    .where(eq(ugea.slug, slug))
    .limit(1);

  return existing[0] ?? null;
}

export async function upsertTender(data: TenderListItem): Promise<void> {
  const u = await getOrCreateUgea(data.ugea);

  await db
    .insert(tender)
    .values({
      reference: data.reference,
      type: data.type,
      category: data.category,
      object: data.object,
      ugeaId: u?.id ?? null,
      ugeaSlug: u?.slug ?? null,
      province: data.province,
      launchedAt: data.launchedAt,
      openedAt: data.openedAt,
      detailsUrl: data.detailsUrl,
    })
    .onConflictDoUpdate({
      target: tender.reference,
      set: {
        openedAt: data.openedAt,
        lastSeenAt: new Date(),
        ugeaId: u?.id ?? null,
        ugeaSlug: u?.slug ?? null,
      },
    });
}

export async function listReferencesWithoutDetails(references: string[]): Promise<string[]> {
  if (references.length === 0) return [];

  const rows = await db
    .select({ reference: tender.reference })
    .from(tender)
    .where(and(inArray(tender.reference, references), eq(tender.detailsFetched, false)));

  return rows.map((r) => r.reference);
}

const MONEY_FIELD_FALLBACK = {
  estimatedValue: null,
  provisionalGuarantee: null,
};

export async function saveDetails(reference: string, details: TenderDetails): Promise<void> {
  const found = await db.select().from(tender).where(eq(tender.reference, reference)).limit(1);
  const row = found[0];
  if (!row) throw new Error(`Concurso ${reference} não encontrado`);

  await db
    .update(tender)
    .set({
      regime: details.regime,
      modality: details.modality,
      class: details.class,
      generalObject: details.generalObject,
      currency: details.currency,
      estimatedValue: details.estimatedValue != null ? String(details.estimatedValue) : MONEY_FIELD_FALLBACK.estimatedValue,
      provisionalGuarantee:
        details.provisionalGuarantee != null ? String(details.provisionalGuarantee) : MONEY_FIELD_FALLBACK.provisionalGuarantee,
      awardCriteria: details.awardCriteria,
      lotCount: details.lotCount,
      proposalDelivery: details.proposalDelivery,
      deliveryTime: details.deliveryTime,
      openingTime: details.openingTime,
      observations: details.observations,
      publishedAt: details.publishedAt,
      openedAt: details.openedAt ?? row.openedAt,
      launchedAt: details.launchedAt ?? row.launchedAt,
      detailsFetched: true,
    })
    .where(eq(tender.reference, reference));

  const documents = [
    { type: "notice", name: "Anúncio", url: details.noticeUrl },
    { type: "document", name: "Documento de Concurso", url: details.documentUrl },
  ];

  for (const document of documents) {
    if (!document.url) continue;

    await db
      .insert(tenderDocument)
      .values({ tenderId: row.id, type: document.type, name: document.name, url: document.url })
      .onConflictDoUpdate({
        target: [tenderDocument.tenderId, tenderDocument.type],
        set: { url: document.url },
      });
  }
}