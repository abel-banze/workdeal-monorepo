import { z } from "zod";

// ── Tasks / Pedidos de serviço ─────────────────────────────────────

export const taskStatusSchema = z.enum(["open", "in_review", "in_progress", "completed", "cancelled", "withdrawn"]);
export const proposalStatusSchema = z.enum(["submitted", "shortlisted", "rejected", "withdrawn", "accepted"]);
export const bidStatusSchema = z.enum(["awarded", "in_progress", "completed", "cancelled", "disputed"]);

export const TASK_STATUS_LABELS_PT: Record<z.infer<typeof taskStatusSchema>, string> = {
  open: "Aceitando propostas",
  in_review: "Em análise",
  in_progress: "Em execução",
  completed: "Concluída",
  cancelled: "Cancelada",
  withdrawn: "Retirada",
};

export const PROPOSAL_STATUS_LABELS_PT: Record<z.infer<typeof proposalStatusSchema>, string> = {
  submitted: "Submetida",
  shortlisted: "Pré-seleccionada",
  rejected: "Recusada",
  withdrawn: "Retirada",
  accepted: "Aceite",
};

export const BID_STATUS_LABELS_PT: Record<z.infer<typeof bidStatusSchema>, string> = {
  awarded: "Adjudicada",
  in_progress: "Em execução",
  completed: "Concluída",
  cancelled: "Cancelada",
  disputed: "Em disputa",
};

export const taskAttachmentSchema = z.object({
  fileId: z.string().min(1, "Ficheiro em falta"),
  url: z.string().min(1, "URL do ficheiro em falta"),
  name: z.string().trim().max(255).optional().default(""),
});

const taskFormFields = z.object({
  requesterOrganizationId: z.string().min(1).nullable().optional(),
  categoryId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(5, "Título deve ter pelo menos 5 caracteres").max(120),
  description: z.string().trim().min(20, "Descrição deve ter pelo menos 20 caracteres").max(5000),
  priceMinMzn: z.number().int().min(0).nullable().optional(),
  priceMaxMzn: z.number().int().min(0).nullable().optional(),
  province: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  attachments: z.array(taskAttachmentSchema).max(5).default([]),
});

export const createTaskSchema = taskFormFields.refine(
  (d) => d.priceMinMzn == null || d.priceMaxMzn == null || d.priceMinMzn <= d.priceMaxMzn,
  {
    message: "Orçamento mínimo deve ser ≤ máximo",
    path: ["priceMaxMzn"],
  },
);

export const updateTaskSchema = taskFormFields.partial().extend({
  status: taskStatusSchema.optional(),
});

export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  categoryId: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "near deve ser 'lat,lng'")
    .optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).default(25).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// ── Propostas ──────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  taskId: z.string().min(1, "Tarefa obrigatória"),
  providerProfileId: z.string().min(1, "Perfil do fornecedor obrigatório"),
  message: z.string().trim().min(20, "Proposta deve ter pelo menos 20 caracteres").max(4000),
  priceMzn: z.number().int().min(0).nullable().optional(),
  estimatedDays: z.number().int().min(1).max(3650).nullable().optional(),
});

export const updateProposalStatusSchema = z.object({
  status: z.enum(["shortlisted", "rejected"]),
});

export const proposalListQuerySchema = z.object({
  role: z.enum(["received", "sent"]).optional().default("received"),
  status: proposalStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// ── Contraproposta / adjudicação (bid) ─────────────────────────────

export const createBidSchema = z.object({
  proposalId: z.string().min(1, "Proposta obrigatória"),
  agreedPriceMzn: z.number().int().min(0, "Valor acordado é obrigatório"),
  agreedDeadlineAt: z.coerce.date().nullable().optional(),
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const updateBidStatusSchema = z.object({
  status: bidStatusSchema,
  reviewNote: z.string().trim().max(1000).nullable().optional(),
});

export const bidListQuerySchema = z.object({
  role: z.enum(["requester", "provider"]).optional().default("provider"),
  status: bidStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// ── Views (respostas da API) ───────────────────────────────────────

export const taskViewSchema = z.object({
  id: z.string(),
  requesterUserId: z.string(),
  requesterOrganizationId: z.string().nullable(),
  categoryId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  priceMinMzn: z.number().nullable(),
  priceMaxMzn: z.number().nullable(),
  province: z.string().nullable(),
  district: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  dueAt: z.date().nullable(),
  attachments: z.array(taskAttachmentSchema).default([]),
  status: taskStatusSchema,
  proposalCount: z.number().optional().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o frontend público/dashboard (quem pediu)
  requesterProfileName: z.string().nullable().optional(),
  requesterProfileSlug: z.string().nullable().optional(),
  requesterProfileLogo: z.string().nullable().optional(),
  // Distância ao utilizador quando listado por proximidade (near)
  distanceKm: z.number().nullable().optional(),
});

export const proposalViewSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  providerProfileId: z.string(),
  message: z.string(),
  priceMzn: z.number().nullable(),
  estimatedDays: z.number().nullable(),
  status: proposalStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o dashboard (apresentação)
  taskTitle: z.string().nullable().optional(),
  taskStatus: taskStatusSchema.nullable().optional(),
  requesterUserName: z.string().nullable().optional(),
  providerProfileName: z.string().nullable().optional(),
  providerProfileSlug: z.string().nullable().optional(),
  providerProfileLogo: z.string().nullable().optional(),
});

export const bidViewSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  proposalId: z.string(),
  providerProfileId: z.string(),
  requesterUserId: z.string(),
  agreedPriceMzn: z.number(),
  agreedDeadlineAt: z.date().nullable(),
  status: bidStatusSchema,
  reviewNote: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o dashboard (apresentação)
  taskTitle: z.string().nullable().optional(),
  taskStatus: taskStatusSchema.nullable().optional(),
  requesterUserName: z.string().nullable().optional(),
  providerProfileName: z.string().nullable().optional(),
  providerProfileSlug: z.string().nullable().optional(),
});

export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type BidStatus = z.infer<typeof bidStatusSchema>;
export type TaskAttachment = z.infer<typeof taskAttachmentSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type ProposalListQuery = z.infer<typeof proposalListQuerySchema>;
export type CreateBidInput = z.infer<typeof createBidSchema>;
export type BidListQuery = z.infer<typeof bidListQuerySchema>;
export type TaskView = z.infer<typeof taskViewSchema>;
export type ProposalView = z.infer<typeof proposalViewSchema>;
export type BidView = z.infer<typeof bidViewSchema>;