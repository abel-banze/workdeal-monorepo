import { z } from "zod";

export const verificationStatusSchema = z.enum(["pending", "in_review", "approved", "rejected"]);
export const verificationLevelSchema = z.enum(["level1", "level2"]);
export const verificationListQuerySchema = z.object({
  status: verificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

/**
 * Documentos exigidos no processo de verificação.
 * `required: true` → obrigatórios no 1º grau (empresa totalmente legalizada);
 * no 2º grau (em legalização) o anexo é opcional.
 */
export const VERIFICATION_DOCUMENT_TYPES = [
  { id: "certidao_registo_definitivo", label: "Certidão de Registo Definitivo", shortLabel: "Certidão de Registo", required: true },
  { id: "estatutos", label: "Estatutos", shortLabel: "Estatutos", required: true },
  { id: "nuit", label: "NUIT", shortLabel: "NUIT", required: true },
  { id: "alvara_comercial", label: "Alvará Comercial", shortLabel: "Alvará Comercial", required: true },
  { id: "declaracao_inicio_atividade", label: "Declaração de Início de Atividade", shortLabel: "Decl. Início de Atividade", required: false },
  { id: "certidao_inscricao_inss", label: "Certidão de Inscrição no INSS", shortLabel: "Inscrição no INSS", required: false },
] as const;

export type VerificationDocumentType = (typeof VERIFICATION_DOCUMENT_TYPES)[number]["id"];

export const verificationDocumentSchema = z.object({
  type: z.enum(VERIFICATION_DOCUMENT_TYPES.map((d) => d.id) as [string, ...string[]]),
  fileId: z.string().min(1, "Ficheiro em falta"),
  url: z.string().min(1, "URL do ficheiro em falta"),
  name: z.string().trim().max(255).optional().default(""),
});

export const verificationRequestSchema = z.object({
  profileId: z.string().min(1, "profileId obrigatório"),
  documents: z.array(verificationDocumentSchema).max(VERIFICATION_DOCUMENT_TYPES.length).default([]),
  // level1 = todos os documentos de registo legal; level2 = ainda em processo de legalização
  level: verificationLevelSchema.default("level1"),
});

export const verificationReviewSchema = z.object({
  reviewNote: z.string().trim().max(1000).optional(),
});

export function verificationDocumentLabel(type: string): string {
  return VERIFICATION_DOCUMENT_TYPES.find((d) => d.id === type)?.label ?? type;
}

/** Tipos obrigatórios de documentos que ainda faltam no pedido (vazio → pronto). */
export function missingVerificationDocuments(documents: Array<{ type: string }>, level: "level1" | "level2"): string[] {
  if (level !== "level1") return [];
  return VERIFICATION_DOCUMENT_TYPES.filter((d) => d.required && !documents.some((doc) => doc.type === d.id)).map((d) => d.id);
}

export type VerificationListQuery = z.infer<typeof verificationListQuerySchema>;
export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>;
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;
export type VerificationDocumentInput = z.infer<typeof verificationDocumentSchema>;