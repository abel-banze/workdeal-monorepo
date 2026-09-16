import { z } from "zod";

// ── Negociação de propostas (chat) ─────────────────────────────────

export const negotiationStatusSchema = z.enum(["open", "closed"]);
export const negotiationMessageKindSchema = z.enum(["text", "offer", "system"]);
export const negotiationSenderSideSchema = z.enum(["requester", "provider"]);

export const NEGOTIATION_STATUS_LABELS_PT: Record<z.infer<typeof negotiationStatusSchema>, string> = {
  open: "Em negociação",
  closed: "Encerrada",
};

export const createThreadSchema = z.object({
  proposalId: z.string().min(1, "Proposta obrigatória"),
});

export const negotiationOfferDecisionSchema = z.enum(["accepted", "rejected"]);

export const NEGOTIATION_OFFER_DECISION_LABELS_PT: Record<z.infer<typeof negotiationOfferDecisionSchema>, string> = {
  accepted: "Aceite",
  rejected: "Recusada",
};

export const sendNegotiationMessageSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    body: z.string().trim().min(1, "Mensagem em branco").max(4000),
  }),
  z.object({
    kind: z.literal("offer"),
    body: z.string().trim().max(4000).optional().default(""),
    priceMzn: z.number().int().min(0, "Valor inválido").max(1_000_000_000),
    estimatedDays: z.number().int().min(1).max(3650).nullable().optional(),
  }),
]);

export const negotiationListThreadsQuerySchema = z.object({
  role: z.enum(["requester", "provider"]).optional(),
  status: negotiationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const negotiationListMessagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
});

// ── Views (respostas da API) ───────────────────────────────────────

export const negotiationThreadViewSchema = z.object({
  id: z.string(),
  taskProposalId: z.string(),
  taskId: z.string(),
  status: negotiationStatusSchema,
  messageCount: z.number(),
  lastMessageAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o dashboard (apresentação)
  taskTitle: z.string().nullable().optional(),
  proposalPriceMzn: z.number().nullable().optional(),
  proposalStatus: z.enum(["submitted", "shortlisted", "rejected", "withdrawn", "accepted"]).nullable().optional(),
  providerProfileName: z.string().nullable().optional(),
  providerProfileSlug: z.string().nullable().optional(),
  providerProfileLogo: z.string().nullable().optional(),
  requesterProfileName: z.string().nullable().optional(),
  unreadCount: z.number().int().min(0).optional().default(0),
});

export const negotiationOfferStatusSchema = z.enum(["pending", "accepted", "rejected"]);

export const negotiationMessageViewSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  senderUserId: z.string(),
  senderProfileId: z.string().nullable(),
  senderSide: negotiationSenderSideSchema,
  kind: negotiationMessageKindSchema,
  body: z.string(),
  priceMzn: z.number().int().nullable().optional(),
  estimatedDays: z.number().int().nullable().optional(),
  offerStatus: negotiationOfferStatusSchema.default("pending"),
  seenByRequester: z.boolean(),
  seenByProvider: z.boolean(),
  createdAt: z.date(),
  senderName: z.string().nullable().optional(),
});

export const negotiationThreadDetailSchema = negotiationThreadViewSchema.extend({
  messages: z.array(negotiationMessageViewSchema).default([]),
});

export type NegotiationStatus = z.infer<typeof negotiationStatusSchema>;
export type NegotiationOfferDecision = z.infer<typeof negotiationOfferDecisionSchema>;
export type NegotiationOfferStatus = z.infer<typeof negotiationOfferStatusSchema>;
export type NegotiationMessageKind = z.infer<typeof negotiationMessageKindSchema>;
export type SenderSide = z.infer<typeof negotiationSenderSideSchema>;
export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type SendNegotiationMessageInput = z.infer<typeof sendNegotiationMessageSchema>;
export type NegotiationThreadView = z.infer<typeof negotiationThreadViewSchema>;
export type NegotiationMessageView = z.infer<typeof negotiationMessageViewSchema>;
export type NegotiationThreadDetail = z.infer<typeof negotiationThreadDetailSchema>;