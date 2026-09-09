import { z } from "zod";

// Programas de afiliados: users/empresas convidam empresas com um código
// (cupom) ou link; a comissão é creditada quando a empresa convidada paga
// a primeira factura.

export const AFFILIATE_ACTOR_TYPES = ["user", "organization"] as const;
export const AFFILIATE_COMMISSION_TYPES = ["percent", "fixed"] as const;
export const AFFILIATE_STATUSES = ["active", "suspended"] as const;
export const AFFILIATE_REFERRAL_SOURCES = ["coupon", "link"] as const;
export const AFFILIATE_REFERRAL_STATUSES = ["attributed", "converted", "voided"] as const;
export const AFFILIATE_EARNING_STATUSES = ["pending", "paid", "cancelled"] as const;

export const affiliateCodeSchema = z
  .string()
  .trim()
  .min(4, "Código muito curto")
  .max(20, "Código demasiado longo");
export type AffiliateCode = z.infer<typeof affiliateCodeSchema>;

export const affiliateValidateInputSchema = z.object({
  code: affiliateCodeSchema,
});
export type AffiliateValidateInput = z.infer<typeof affiliateValidateInputSchema>;

// Código normalizado (maiúsculas, sem espaços) usado em cupons e links.
export function normalizeAffiliateCode(code: string): string {
  return code.trim().toUpperCase();
}

export const affiliateAttributionSourceSchema = z.enum(AFFILIATE_REFERRAL_SOURCES);
export type AffiliateAttributionSource = z.infer<typeof affiliateAttributionSourceSchema>;

// Atribuição feita no onboarding: empresa criada + código usado.
export const affiliateAttributionInputSchema = z.object({
  organizationId: z.string().min(1),
  code: affiliateCodeSchema,
  source: affiliateAttributionSourceSchema.default("coupon"),
});
export type AffiliateAttributionInput = z.infer<typeof affiliateAttributionInputSchema>;

export const affiliateSchema = z.object({
  id: z.string(),
  actorType: z.enum(AFFILIATE_ACTOR_TYPES),
  actorName: z.string(),
  actorId: z.string(),
  code: z.string(),
  commissionType: z.enum(AFFILIATE_COMMISSION_TYPES),
  commissionValue: z.number().int().min(0),
  status: z.enum(AFFILIATE_STATUSES),
  createdAt: z.date(),
});
export type Affiliate = z.infer<typeof affiliateSchema>;

export const affiliateReferralViewSchema = z.object({
  id: z.string(),
  code: z.string(),
  source: z.enum(AFFILIATE_REFERRAL_SOURCES),
  status: z.enum(AFFILIATE_REFERRAL_STATUSES),
  referredCompanyName: z.string().nullable(),
  commissionAmountMzn: z.number().int().nullable(),
  createdAt: z.date(),
  convertedAt: z.date().nullable(),
});
export type AffiliateReferralView = z.infer<typeof affiliateReferralViewSchema>;

export const affiliateEarningViewSchema = z.object({
  id: z.string(),
  amountMzn: z.number().int().min(0),
  status: z.enum(AFFILIATE_EARNING_STATUSES),
  referredCompanyName: z.string().nullable(),
  createdAt: z.date(),
  paidAt: z.date().nullable(),
});
export type AffiliateEarningView = z.infer<typeof affiliateEarningViewSchema>;

// Painel do afiliado
export const affiliateDashboardSchema = z.object({
  affiliate: affiliateSchema.nullable(),
  inviteLink: z.string(),
  referrals: z.array(affiliateReferralViewSchema),
  earnings: z.array(affiliateEarningViewSchema),
  totals: z.object({
    companiesInvited: z.number().int().min(0),
    conversions: z.number().int().min(0),
    pendingMzn: z.number().int().min(0),
    paidMzn: z.number().int().min(0),
  }),
});
export type AffiliateDashboard = z.infer<typeof affiliateDashboardSchema>;

// ── Admin ──────────────────────────────────────────────────────

export const affiliateActorRefSchema = z
  .object({
    actorType: z.enum(AFFILIATE_ACTOR_TYPES),
    actorId: z.string().min(1),
  })
  .refine(
    (v) => (v.actorType === "user" ? true : true),
    "actorId obrigatório",
  );
export type AffiliateActorRef = z.infer<typeof affiliateActorRefSchema>;

export const affiliateCreateInputSchema = z.object({
  actorType: z.enum(AFFILIATE_ACTOR_TYPES),
  actorId: z.string().min(1),
  commissionType: z.enum(AFFILIATE_COMMISSION_TYPES).default("percent"),
  commissionValue: z.number().int().min(0).max(10000),
});
export type AffiliateCreateInput = z.infer<typeof affiliateCreateInputSchema>;

export const affiliateUpdateInputSchema = z.object({
  commissionType: z.enum(AFFILIATE_COMMISSION_TYPES).optional(),
  commissionValue: z.number().int().min(0).max(10000).optional(),
  status: z.enum(AFFILIATE_STATUSES).optional(),
});
export type AffiliateUpdateInput = z.infer<typeof affiliateUpdateInputSchema>;

export const affiliateListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(AFFILIATE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20).optional(),
});
export type AffiliateListQuery = z.infer<typeof affiliateListQuerySchema>;

export const affiliateReferralListQuerySchema = z.object({
  affiliateId: z.string().optional(),
  status: z.enum(AFFILIATE_REFERRAL_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20).optional(),
});
export type AffiliateReferralListQuery = z.infer<typeof affiliateReferralListQuerySchema>;

export const affiliateAdminViewsSchema = z.object({
  id: z.string(),
  actorType: z.enum(AFFILIATE_ACTOR_TYPES),
  actorName: z.string(),
  actorId: z.string(),
  code: z.string(),
  commissionType: z.enum(AFFILIATE_COMMISSION_TYPES),
  commissionValue: z.number().int(),
  status: z.enum(AFFILIATE_STATUSES),
  referralsCount: z.number().int(),
  conversions: z.number().int(),
  pendingMzn: z.number().int(),
  paidMzn: z.number().int(),
  createdAt: z.date(),
});
export type AffiliateAdminView = z.infer<typeof affiliateAdminViewsSchema>;