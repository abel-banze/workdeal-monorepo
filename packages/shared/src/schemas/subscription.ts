import { z } from "zod";
import { verificationPaymentProofSchema } from "./verification.js";

// ── Subscriptions / Pagamentos ─────────────────────────────────
// Ecossistema de billing: planos, subscrições, facturas, pagamentos,
// recibos, cupons, créditos (wallet) e webhooks.

export const SUBSCRIPTION_STATUSES = ["active", "past_due", "trialing", "cancelled", "paused", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// Emitente das facturas/recibos de subscrição (facturação manual).
export const CODEBAZ_BILLING_ISSUER = {
  name: "Codebaz SU, Lda",
  nuit: "401733655",
} as const;

export const PAYMENT_STATUSES = ["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const COUPON_TYPES = ["percent", "fixed"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const PLAN_INTERVALS = ["monthly", "quarterly", "yearly"] as const;
export type PlanInterval = (typeof PLAN_INTERVALS)[number];

export const CREDIT_TRANSACTION_TYPES = ["credit", "debit", "refund"] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export const WEBHOOK_EVENT_STATUSES = ["received", "processed", "failed"] as const;
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];

export const subscriptionStatusSchema = z.enum(SUBSCRIPTION_STATUSES);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const couponTypeSchema = z.enum(COUPON_TYPES);
export const planIntervalSchema = z.enum(PLAN_INTERVALS);
export const creditTransactionTypeSchema = z.enum(CREDIT_TRANSACTION_TYPES);

export const SUBSCRIPTION_STATUS_LABELS_PT: Record<SubscriptionStatus, string> = {
  active: "Activa",
  past_due: "Pagamento em atraso",
  trialing: "Em período experimental",
  cancelled: "Cancelada",
  paused: "Pausada",
  expired: "Expirada",
};

export const PAYMENT_STATUS_LABELS_PT: Record<PaymentStatus, string> = {
  pending: "Pendente",
  processing: "Em processamento",
  succeeded: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  partially_refunded: "Parcialmente reembolsado",
  cancelled: "Cancelado",
};

export const COUPON_TYPE_LABELS_PT: Record<CouponType, string> = {
  percent: "Percentagem",
  fixed: "Valor fixo",
};

export const PLAN_INTERVAL_LABELS_PT: Record<PlanInterval, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export const PAYMENT_METHODS = ["mpesa", "emola", "bank_transfer", "card", "credits"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS_PT: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "E-mola",
  bank_transfer: "Transferência bancária",
  card: "Cartão",
  credits: "Créditos",
};

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);

// ── Planos ─────────────────────────────────────────────────────

// Plano atribuído por defeito a novas empresas (onboarding). Slug estável do
// catálogo seed (packages/db/src/seed-plans.ts — id "plan-free").
export const DEFAULT_FREE_PLAN_SLUG = "free" as const;

export const planSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  inheritFromPlanId: z.string().nullable(),
  priceMzn: z.number().int().min(0),
  interval: planIntervalSchema,
  trialDays: z.number().int().min(0),
  maxProfiles: z.number().int().min(1).nullable(),
  maxTeamMembers: z.number().int().min(1).nullable(),
  maxListings: z.number().int().min(1).nullable(),
  maxBranches: z.number().int().min(1).nullable(),
  apiAccess: z.boolean(),
  maxApiCallsPerMonth: z.number().int().min(1).nullable(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Plan = z.infer<typeof planSchema>;

export const planSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas minúsculas, números e hífens")
  .max(64);

export const planCreateSchema = z.object({
  slug: planSlugSchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  inheritFromPlanId: z.string().min(1).nullable().optional(),
  priceMzn: z.number().int().min(0).default(0),
  interval: planIntervalSchema.default("monthly"),
  trialDays: z.number().int().min(0).max(365).default(0),
  maxProfiles: z.number().int().min(1).nullable().optional(),
  maxTeamMembers: z.number().int().min(1).nullable().optional(),
  maxListings: z.number().int().min(1).nullable().optional(),
  maxBranches: z.number().int().min(1).nullable().optional(),
  apiAccess: z.boolean().default(false),
  maxApiCallsPerMonth: z.number().int().min(1).nullable().optional(),
  isPublic: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  sortOrder: z.number().int().default(0),
});
export type PlanCreateInput = z.infer<typeof planCreateSchema>;

// `slug` é imutável após criação — o update não o aceita.
export const planUpdateSchema = planCreateSchema.omit({ slug: true }).partial().extend({
  isActive: z.boolean().optional(),
});
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

export const planListQuerySchema = z.object({
  includeInactive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
export type PlanListQuery = z.infer<typeof planListQuerySchema>;

export const planFeatureSchema = z.object({
  planId: z.string(),
  featureKey: z.string(),
  featureValue: z.string().nullable(),
  label: z.string().nullable(),
  createdAt: z.date(),
});
export type PlanFeature = z.infer<typeof planFeatureSchema>;

export const planFeatureUpsertSchema = z.object({
  planId: z.string().min(1),
  features: z
    .array(
      z.object({
        featureKey: z.string().trim().min(1).max(64),
        featureValue: z.string().trim().max(255).nullable().optional(),
        label: z.string().trim().max(160).nullable().optional(),
      }),
    )
    .max(100),
});
export type PlanFeatureUpsertInput = z.infer<typeof planFeatureUpsertSchema>;

// ── Subscrições ────────────────────────────────────────────────

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  planId: z.string(),
  status: subscriptionStatusSchema,
  trialStartsAt: z.date().nullable(),
  trialEndsAt: z.date().nullable(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAt: z.date().nullable(),
  cancelledAt: z.date().nullable(),
  cancelReason: z.string().nullable(),
  pausedAt: z.date().nullable(),
  resumeAt: z.date().nullable(),
  couponId: z.string().nullable(),
  discountMzn: z.number().int().min(0),
  provider: z.string().nullable(),
  providerSubscriptionId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

// Cria uma nova subscrição (checkout). `planId` obrigatório; a subscrição pode
// ser pessoal (sem organizationId) ou de empresa.
export const createSubscriptionSchema = z.object({
  planId: z.string().min(1, "Plano obrigatório"),
  organizationId: z.string().min(1).nullable().optional(),
  couponCode: z.string().trim().max(32).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  trialEndsAt: z.coerce.date().nullable().optional(),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

// Cancelamento: `atPeriodEnd=true` mantém a subscrição activa até ao fim do
// período corrente; `false` cancela de imediato.
export const cancelSubscriptionSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
  reason: z.string().trim().max(1000).nullable().optional(),
});
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// Upgrade/downgrade: troca de plano na subscrição existente.
export const changeSubscriptionPlanSchema = z.object({
  planId: z.string().min(1, "Plano obrigatório"),
  prorate: z.boolean().default(true),
});
export type ChangeSubscriptionPlanInput = z.infer<typeof changeSubscriptionPlanSchema>;

export const pauseSubscriptionSchema = z.object({
  resumeAt: z.coerce.date().nullable().optional(),
});
export type PauseSubscriptionInput = z.infer<typeof pauseSubscriptionSchema>;

export const subscriptionListQuerySchema = z.object({
  status: subscriptionStatusSchema.optional(),
  planId: z.string().optional(),
  scope: z.enum(["personal", "organization", "all"]).default("all"),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;

// ── Subscrição do utilizador (portais tenant: dashboard web/mobile) ─────
// Pessoa ou empresa gerem a sua própria subscrição. `organizationId` opcional:
// se ausente, o âmbito é pessoal (subscrição do utilizador sem organização).

export const subscriptionScopeSchema = z.object({
  organizationId: z.string().min(1).optional(),
});
export type SubscriptionScope = z.infer<typeof subscriptionScopeSchema>;

export const changeMySubscriptionPlanSchema = z.object({
  organizationId: z.string().min(1).optional(),
  planId: z.string().min(1, "Plano obrigatório"),
  prorate: z.boolean().default(true),
});
export type ChangeMySubscriptionPlanInput = z.infer<typeof changeMySubscriptionPlanSchema>;

// Primeira activação: cria a subscrição do âmbito (ou reactiva uma
// cancelada/expirada). Mesmo formato do change — a diferença é semântica:
// aqui ainda não existe subscrição activa.
// `payment` usa o mesmo formato do pedido de verificação de identidade
// (transferência Millennium BIM + comprovativo anexado); obrigatório quando
// o plano é pago (priceMzn > 0), ignorado nos gratuitos.
export const subscribeMySubscriptionSchema = z.object({
  organizationId: z.string().min(1).optional(),
  planId: z.string().min(1, "Plano obrigatório"),
  payment: verificationPaymentProofSchema.optional(),
});
export type SubscribeMySubscriptionInput = z.infer<typeof subscribeMySubscriptionSchema>;

export const cancelMySubscriptionSchema = cancelSubscriptionSchema.extend({
  organizationId: z.string().min(1).optional(),
});
export type CancelMySubscriptionInput = z.infer<typeof cancelMySubscriptionSchema>;

export const pauseMySubscriptionSchema = pauseSubscriptionSchema.extend({
  organizationId: z.string().min(1).optional(),
});
export type PauseMySubscriptionInput = z.infer<typeof pauseMySubscriptionSchema>;

export const resumeMySubscriptionSchema = z.object({
  organizationId: z.string().min(1).optional(),
});
export type ResumeMySubscriptionInput = z.infer<typeof resumeMySubscriptionSchema>;

// Validação de pagamento de activação: confirma o pagamento, activa a
// subscrição em pausa, emite o recibo e envia-o à empresa. Nota opcional
// fica registada nas notas internas.
export const adminValidatePaymentSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});
export type AdminValidatePaymentInput = z.infer<typeof adminValidatePaymentSchema>;

// Notificação à empresa (ex: pagamento por confirmar): envia email com a
// mensagem e regista-a nas notas internas da subscrição.
export const adminNotifyCompanySchema = z.object({
  message: z.string().trim().min(1, "Mensagem obrigatória").max(2000),
});
export type AdminNotifyCompanyInput = z.infer<typeof adminNotifyCompanySchema>;

// Override administrativo do estado de uma subscrição (ex: extensão de trial,
// reactivação de subscrição cancelada). Não altera o provider externo.
export const adminUpdateSubscriptionStatusSchema = z.object({
  status: subscriptionStatusSchema,
  note: z.string().trim().max(500).nullable().optional(),
});
export type AdminUpdateSubscriptionStatusInput = z.infer<typeof adminUpdateSubscriptionStatusSchema>;

export const subscriptionViewSchema = subscriptionSchema.extend({
  planName: z.string().optional(),
  planSlug: z.string().optional(),
  planPriceMzn: z.number().int().optional(),
  planInterval: planIntervalSchema.optional(),
  couponCode: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
});
export type SubscriptionView = z.infer<typeof subscriptionViewSchema>;

// ── Facturas ───────────────────────────────────────────────────

export const invoiceSchema = z.object({
  id: z.string(),
  subscriptionId: z.string().nullable(),
  userId: z.string(),
  organizationId: z.string().nullable(),
  invoiceNumber: z.string(),
  status: paymentStatusSchema,
  subtotalMzn: z.number().int().min(0),
  discountMzn: z.number().int().min(0),
  taxMzn: z.number().int().min(0),
  totalMzn: z.number().int().min(0),
  currency: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  dueDate: z.date().nullable(),
  paidAt: z.date().nullable(),
  provider: z.string().nullable(),
  providerInvoiceId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceLineItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  description: z.string(),
  quantity: z.number().int().min(1),
  unitPriceMzn: z.number().int().min(0),
  totalMzn: z.number().int().min(0),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});
export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema>;

export const invoiceViewSchema = invoiceSchema.extend({
  lineItems: z.array(invoiceLineItemSchema).default([]),
  subscriptionStatus: subscriptionStatusSchema.nullable().optional(),
  planName: z.string().nullable().optional(),
  organizationName: z.string().nullable().optional(),
});
export type InvoiceView = z.infer<typeof invoiceViewSchema>;

export const invoiceListQuerySchema = z.object({
  status: paymentStatusSchema.optional(),
  subscriptionId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

// ── Pagamentos ─────────────────────────────────────────────────

export const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  userId: z.string(),
  amountMzn: z.number().int().min(0),
  currency: z.string(),
  status: paymentStatusSchema,
  method: z.string().nullable(),
  provider: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  providerMetadata: z.record(z.string(), z.unknown()).nullable(),
  paidAt: z.date().nullable(),
  refundedAt: z.date().nullable(),
  refundAmountMzn: z.number().int().min(0).nullable(),
  failureReason: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Payment = z.infer<typeof paymentSchema>;

// Inicia o processamento de um pagamento (M-Pesa/E-mola → pede confirmação no
// telemóvel; card/credits → processa de imediato no provider).
export const initiatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Factura obrigatória"),
  method: paymentMethodSchema,
  phoneNumber: z.string().min(9).max(15).optional(),
});
export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  otp: z.string().trim().min(4).max(8).optional(),
});
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;

export const paymentListQuerySchema = z.object({
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type PaymentListQuery = z.infer<typeof paymentListQuerySchema>;

export const paymentViewSchema = paymentSchema.extend({
  invoiceNumber: z.string().nullable().optional(),
});
export type PaymentView = z.infer<typeof paymentViewSchema>;

// ── Recibos ────────────────────────────────────────────────────

export const receiptSchema = z.object({
  id: z.string(),
  paymentId: z.string(),
  receiptNumber: z.string(),
  userId: z.string(),
  amountMzn: z.number().int().min(0),
  currency: z.string(),
  issuedAt: z.date(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});
export type Receipt = z.infer<typeof receiptSchema>;

export const receiptViewSchema = receiptSchema.extend({
  paymentStatus: paymentStatusSchema.optional(),
  invoiceNumber: z.string().nullable().optional(),
});
export type ReceiptView = z.infer<typeof receiptViewSchema>;

// ── Cupons ─────────────────────────────────────────────────────

export const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  type: couponTypeSchema,
  value: z.number().int().min(0),
  maxTotalUses: z.number().int().min(1).nullable(),
  usedCount: z.number().int().min(0),
  maxUsesPerUser: z.number().int().min(1),
  minAmountMzn: z.number().int().min(0).nullable(),
  validFrom: z.date().nullable(),
  validUntil: z.date().nullable(),
  isActive: z.boolean(),
  appliesTo: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Coupon = z.infer<typeof couponSchema>;

export const couponCodeSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => /^[A-Z0-9][A-Z0-9-]{2,31}$/.test(v), "Código inválido: apenas letras, números e hífens");

const couponFieldsSchema = z.object({
  code: couponCodeSchema,
  description: z.string().trim().max(300).nullable().optional(),
  type: couponTypeSchema,
  value: z.number().int().min(1).max(1000000),
  maxTotalUses: z.number().int().min(1).nullable().optional(),
  maxUsesPerUser: z.number().int().min(1).default(1),
  minAmountMzn: z.number().int().min(0).nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  appliesTo: z.string().trim().max(64).nullable().optional(),
});

export const couponCreateSchema = couponFieldsSchema
  .refine((d) => d.type !== "percent" || d.value <= 100, {
    message: "Percentagem deve ser ≤ 100",
    path: ["value"],
  })
  .refine((d) => !d.validFrom || !d.validUntil || d.validFrom <= d.validUntil, {
    message: "validFrom deve ser anterior a validUntil",
    path: ["validUntil"],
  });
export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

// `code` e `type` são imutáveis após criação.
export const couponUpdateSchema = couponFieldsSchema
  .omit({ code: true, type: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });
export type CouponUpdateInput = z.infer<typeof couponUpdateSchema>;

// Validação pública de um código (antes de aplicar ao checkout).
export const validateCouponSchema = z.object({
  code: couponCodeSchema,
  planId: z.string().min(1).optional(),
});
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const couponValidationResultSchema = z.object({
  code: z.string(),
  type: couponTypeSchema,
  value: z.number().int(),
  discountMzn: z.number().int().min(0),
  finalPriceMzn: z.number().int().min(0),
  isActive: z.boolean(),
  expiresAt: z.date().nullable(),
});
export type CouponValidationResult = z.infer<typeof couponValidationResultSchema>;

export const couponListQuerySchema = z.object({
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  q: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});
export type CouponListQuery = z.infer<typeof couponListQuerySchema>;

// ── Créditos / wallet ──────────────────────────────────────────

export const creditAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  balanceMzn: z.number().int().min(0),
  currency: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CreditAccount = z.infer<typeof creditAccountSchema>;

export const creditTransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: creditTransactionTypeSchema,
  amountMzn: z.number().int().min(0),
  balanceAfter: z.number().int().min(0),
  description: z.string().nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.date(),
});
export type CreditTransaction = z.infer<typeof creditTransactionSchema>;

export const creditTopUpSchema = z.object({
  amountMzn: z.number().int().min(1).max(1_000_000),
  method: paymentMethodSchema,
  phoneNumber: z.string().min(9).max(15).optional(),
});
export type CreditTopUpInput = z.infer<typeof creditTopUpSchema>;

export const creditTransactionListQuerySchema = z.object({
  type: creditTransactionTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type CreditTransactionListQuery = z.infer<typeof creditTransactionListQuerySchema>;

// ── Webhooks ───────────────────────────────────────────────────

export const webhookEventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  externalId: z.string(),
  eventType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(WEBHOOK_EVENT_STATUSES),
  processedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

export const webhookEventListQuerySchema = z.object({
  provider: z.string().optional(),
  status: z.enum(WEBHOOK_EVENT_STATUSES).optional(),
  eventType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});
export type WebhookEventListQuery = z.infer<typeof webhookEventListQuerySchema>;