import { z } from "zod";

export const BADGE_TYPES = [
  "trust",
  "quality",
  "activity",
  "reputation",
  "specialization",
  "network",
  "performance",
  "commercial",
  "promotional",
  "informational",
] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

export const BADGE_ORIGINS = ["automatic", "manual", "paid"] as const;
export type BadgeOrigin = (typeof BADGE_ORIGINS)[number];

export const BADGE_STATUSES = ["active", "revoked"] as const;
export type BadgeStatus = (typeof BADGE_STATUSES)[number];

export const BADGE_TYPE_LABELS: Record<BadgeType, string> = {
  trust: "Confiança",
  quality: "Qualidade",
  activity: "Actividade",
  reputation: "Reputação",
  specialization: "Especialização",
  network: "Rede",
  performance: "Desempenho",
  commercial: "Comercial",
  promotional: "Promocional",
  informational: "Informativo",
};

export const BADGE_ORIGIN_LABELS: Record<BadgeOrigin, string> = {
  automatic: "Automático",
  manual: "Manual",
  paid: "Pago",
};

export const badgeTypeSchema = z.enum(BADGE_TYPES);
export const badgeOriginSchema = z.enum(BADGE_ORIGINS);
export const badgeStatusSchema = z.enum(BADGE_STATUSES);

export const badgeSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas minúsculas, números e hífens")
  .max(64);

// Linha do catálogo de selos (`badge`).
export const badgeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: badgeTypeSchema,
  origin: badgeOriginSchema,
  criteria: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Badge = z.infer<typeof badgeSchema>;

export const badgeCreateSchema = z.object({
  slug: badgeSlugSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  type: badgeTypeSchema,
  origin: badgeOriginSchema,
  criteria: z.string().trim().max(500).nullable().optional(),
});
export type BadgeCreateInput = z.infer<typeof badgeCreateSchema>;

// O slug é imutável após criação (usado em filtros e URLs) — update não o aceita.
// `isActive` só se altera no update (via toggle/edição) — não entra no create.
export const badgeUpdateSchema = badgeCreateSchema.omit({ slug: true }).partial().extend({
  isActive: z.boolean().optional(),
});
export type BadgeUpdateInput = z.infer<typeof badgeUpdateSchema>;

// Catálogo público (filtros de UI) — só selos activos.
export const badgesListQuerySchema = z.object({
  type: badgeTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
export type BadgesListQuery = z.infer<typeof badgesListQuerySchema>;

export const adminBadgesListQuerySchema = badgesListQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  origin: badgeOriginSchema.optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});
export type AdminBadgesListQuery = z.infer<typeof adminBadgesListQuerySchema>;

// Atribuição manual de um selo a uma instituição.
export const badgeAssignSchema = z.object({
  badgeId: z.string().min(1),
});
export type BadgeAssignInput = z.infer<typeof badgeAssignSchema>;

// Vista rica de um selo atribuído a um perfil (admin/gestão) — com meta.
export const assignedBadgeViewSchema = z.object({
  badgeId: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: badgeTypeSchema,
  origin: badgeOriginSchema,
  criteria: z.string().nullable(),
  isActive: z.boolean(),
  status: badgeStatusSchema,
  awardedAt: z.date(),
  revokedAt: z.date().nullable(),
  awardedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
});
export type AssignedBadgeView = z.infer<typeof assignedBadgeViewSchema>;