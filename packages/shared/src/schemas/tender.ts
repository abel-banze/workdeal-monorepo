import { z } from "zod";

// ── Concursos públicos (tenders) ───────────────────────────────────
// Feed importado pelo scraper UFSA. `estimatedValue`/`provisionalGuarantee`
// vêm como string porque em Postgres são `numeric` (BigDecimal).

export const tenderSourceSchema = z.enum(["ufsa"]);
export const tenderStatusSchema = z.enum(["draft", "published", "archived"]);

export const TENDER_STATUS_LABELS_PT: Record<z.infer<typeof tenderStatusSchema>, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

export const tenderListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  province: z.string().min(1).max(80).optional(),
  category: z.string().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const tenderDocumentViewSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  url: z.string(),
});

export const tenderViewSchema = z.object({
  id: z.string(),
  source: tenderSourceSchema,
  reference: z.string(),
  ugeaId: z.string().nullable(),
  ugeaSlug: z.string().nullable(),
  type: z.string().nullable(),
  category: z.string().nullable(),
  object: z.string().nullable(),
  province: z.string().nullable(),
  launchedAt: z.date().nullable(),
  openedAt: z.date().nullable(),
  detailsUrl: z.string().nullable(),
  regime: z.string().nullable(),
  modality: z.string().nullable(),
  class: z.string().nullable(),
  generalObject: z.string().nullable(),
  currency: z.string().nullable(),
  estimatedValue: z.string().nullable(),
  provisionalGuarantee: z.string().nullable(),
  awardCriteria: z.string().nullable(),
  lotCount: z.string().nullable(),
  proposalDelivery: z.string().nullable(),
  deliveryTime: z.string().nullable(),
  openingTime: z.string().nullable(),
  observations: z.string().nullable(),
  publishedAt: z.date().nullable(),
  description: z.string().nullable(),
  status: tenderStatusSchema,
  firstSeenAt: z.date(),
  lastSeenAt: z.date(),
  // Enriquecimento para o frontend público
  ugeaName: z.string().nullable().optional(),
  documents: z.array(tenderDocumentViewSchema).optional(),
});

export type TenderStatus = z.infer<typeof tenderStatusSchema>;
export type TenderListQuery = z.infer<typeof tenderListQuerySchema>;
export type TenderDocumentView = z.infer<typeof tenderDocumentViewSchema>;
export type TenderView = z.infer<typeof tenderViewSchema>;