import { z } from "zod";

// ── Assistente (chat) ─────────────────────────────────────────────────────
export const assistantChatSchema = z.object({
  message: z.string().trim().min(1, "Mensagem em falta").max(4000),
  organizationId: z.string().min(1).nullable().optional(),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;

// ── Draft de proposta ─────────────────────────────────────────────────────
export const proposalDraftSchema = z.object({
  taskId: z.string().min(1, "Tarefa obrigatória"),
  providerProfileId: z.string().min(1, "Perfil do fornecedor obrigatório"),
  priceMzn: z.number().int().min(0).nullable().optional(),
  estimatedDays: z.number().int().min(1).max(3650).nullable().optional(),
  organizationId: z.string().min(1).nullable().optional(),
});

export type ProposalDraftInput = z.infer<typeof proposalDraftSchema>;

// ── Draft de resposta ─────────────────────────────────────────────────────
export const responseDraftContextTypeSchema = z.enum(["quote", "opportunity", "contact"]);

export const responseDraftSchema = z.object({
  contextType: responseDraftContextTypeSchema,
  subject: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(2000).nullable().optional(),
  fromName: z.string().trim().max(120).nullable().optional(),
  fromOrganization: z.string().trim().max(200).nullable().optional(),
  organizationId: z.string().min(1).nullable().optional(),
});

export type ResponseDraftInput = z.infer<typeof responseDraftSchema>;
export type ResponseDraftContextType = z.infer<typeof responseDraftContextTypeSchema>;

// ── Assistente de perfil público (chat por visita) ─────────────────────────
export const profileAssistantChatSchema = z.object({
  message: z.string().trim().min(1, "Mensagem em falta").max(4000),
});

export type ProfileAssistantChatInput = z.infer<typeof profileAssistantChatSchema>;

// ── Gestão de IA no admin ─────────────────────────────────────────────────
export const aiProviderSchema = z.enum(["mock", "google", "anthropic", "openai"]);
export const aiRealProviderSchema = z.enum(["google", "anthropic", "openai"]);
export const aiTierSchema = z.enum(["flash", "pro"]);

export const aiBudgetSchema = z.object({
  maxInputTokens: z.number().int().positive().max(200_000).nullable().optional(),
  maxOutputTokens: z.number().int().positive().max(32_000).nullable().optional(),
  maxCostUsd: z.number().positive().max(5).nullable().optional(),
});
export type AiBudgetInput = z.infer<typeof aiBudgetSchema>;

/** Modelos por `tier.provider` → ID de modelo (override gerido no admin). Valor vazio = usar default. */
export const aiSettingsUpdateSchema = z.object({
  provider: aiProviderSchema,
  modelOverrides: z
    .record(aiTierSchema, z.record(aiRealProviderSchema, z.string().trim().max(200)))
    .nullable()
    .optional(),
  budgets: aiBudgetSchema.nullable().optional(),
});
export type AiSettingsUpdateInput = z.infer<typeof aiSettingsUpdateSchema>;

export const aiCredentialUpsertSchema = z.object({
  provider: aiRealProviderSchema,
  apiKey: z.string().trim().min(1, "API key obrigatória").max(4096),
});
export type AiCredentialUpsertInput = z.infer<typeof aiCredentialUpsertSchema>;

export const aiUsageQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  agentKey: z.string().optional(),
  provider: z.string().optional(),
});
export type AiUsageQueryInput = z.infer<typeof aiUsageQuerySchema>;
