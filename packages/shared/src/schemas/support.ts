import { z } from "zod";

// ── Suporte (helpdesk) ─────────────────────────────────────────────

export const supportTicketStatusSchema = z.enum(["open", "in_progress", "waiting_user", "resolved", "closed"]);
export type SupportTicketStatus = z.infer<typeof supportTicketStatusSchema>;

export const supportTicketCategorySchema = z.enum(["conta", "perfil", "tarefas", "eventos", "pagamentos", "tecnico", "outro"]);
export type SupportTicketCategory = z.infer<typeof supportTicketCategorySchema>;

export const SUPPORT_TICKET_STATUS_LABELS_PT: Record<SupportTicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_user: "A aguardar resposta",
  resolved: "Resolvido",
  closed: "Fechado",
};

export const SUPPORT_TICKET_CATEGORY_LABELS_PT: Record<SupportTicketCategory, string> = {
  conta: "Conta e acesso",
  perfil: "Perfil da empresa",
  tarefas: "Tarefas e propostas",
  eventos: "Eventos",
  pagamentos: "Pagamentos e subscrição",
  tecnico: "Problema técnico",
  outro: "Outro",
};

export const createSupportTicketSchema = z.object({
  organizationId: z.string().min(1).nullable().optional(),
  subject: z.string().trim().min(5, "Assunto deve ter pelo menos 5 caracteres").max(160),
  category: supportTicketCategorySchema.optional().default("outro"),
  message: z.string().trim().min(10, "Descreve o problema com pelo menos 10 caracteres").max(5000),
});
export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;

export const replySupportTicketSchema = z.object({
  message: z.string().trim().min(1, "Mensagem vazia").max(5000),
});
export type ReplySupportTicketInput = z.infer<typeof replySupportTicketSchema>;

export const updateSupportTicketStatusSchema = z.object({
  status: z.enum(["in_progress", "waiting_user", "resolved", "closed"]),
});
export type UpdateSupportTicketStatusInput = z.infer<typeof updateSupportTicketStatusSchema>;

export const supportTicketListQuerySchema = z.object({
  status: supportTicketStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SupportTicketListQuery = z.infer<typeof supportTicketListQuerySchema>;

// ── Feedback ───────────────────────────────────────────────────────

export const feedbackKindSchema = z.enum(["suggestion", "bug", "praise"]);
export type FeedbackKind = z.infer<typeof feedbackKindSchema>;

export const feedbackStatusSchema = z.enum(["open", "in_review", "resolved", "dismissed"]);
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;

export const FEEDBACK_KIND_LABELS_PT: Record<FeedbackKind, string> = {
  suggestion: "Sugestão",
  bug: "Erro / bug",
  praise: "Elogio",
};

export const FEEDBACK_STATUS_LABELS_PT: Record<FeedbackStatus, string> = {
  open: "Aberto",
  in_review: "Em análise",
  resolved: "Resolvido",
  dismissed: "Dispensado",
};

export const createFeedbackSchema = z.object({
  organizationId: z.string().min(1).nullable().optional(),
  kind: feedbackKindSchema.optional().default("suggestion"),
  message: z.string().trim().min(10, "Conta-nos um pouco mais (mín. 10 caracteres)").max(3000),
  page: z.string().trim().max(500).nullable().optional(),
});
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const updateFeedbackSchema = z.object({
  status: feedbackStatusSchema,
  adminNote: z.string().trim().max(1000).nullable().optional(),
});
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;

export const feedbackListQuerySchema = z.object({
  status: feedbackStatusSchema.optional(),
  kind: feedbackKindSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;
