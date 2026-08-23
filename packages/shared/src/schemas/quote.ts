import { z } from "zod";

export const quoteStatusSchema = z.enum(["pending", "viewed", "quoted", "declined", "closed"]);

export const createQuoteSchema = z.object({
  targetProfileId: z.string().min(1, "Perfil destino é obrigatório"),
  requesterOrganizationId: z.string().min(1).nullable().optional(),
  serviceLabel: z.string().trim().min(2, "Serviço é obrigatório").max(120),
  serviceTag: z.string().trim().max(64).nullable().optional(),
  portfolioItemId: z.string().min(1).nullable().optional(),
  message: z.string().trim().min(10, "Mensagem deve ter ≥10 caracteres").max(2000),
  contactName: z.string().trim().min(2, "Nome inválido").max(80),
  contactEmail: z.string().trim().email("Email inválido").max(254),
  contactPhone: z.string().trim().max(32).nullable().optional(),
  fileIds: z.array(z.string().min(1)).max(5).optional().default([]),
});

export const updateQuoteStatusSchema = z.object({
  status: quoteStatusSchema,
});

export const listQuotesQuerySchema = z.object({
  role: z.enum(["incoming", "outgoing"]).optional().default("incoming"),
  status: quoteStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const fileViewSchema = z.object({
  id: z.string(),
  url: z.string(),
  publicId: z.string(),
  resourceType: z.string(),
  format: z.string().nullable(),
  bytes: z.number().nullable(),
  originalFilename: z.string().nullable(),
  createdAt: z.date(),
});

export const quoteViewSchema = z.object({
  id: z.string(),
  targetProfileId: z.string(),
  requesterUserId: z.string(),
  requesterOrganizationId: z.string().nullable(),
  serviceLabel: z.string(),
  serviceTag: z.string().nullable(),
  portfolioItemId: z.string().nullable(),
  message: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string().nullable(),
  status: quoteStatusSchema,
  files: z.array(fileViewSchema).optional().default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type QuoteView = z.infer<typeof quoteViewSchema>;
