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

// Conta Millennium BIM para pagamento do plano Workdeal Trust associado à
// verificação de identidade. O comprovativo de pagamento é anexado ao pedido.
export const VERIFICATION_TRUST_PAYMENT = {
  planName: "Workdeal Trust",
  bankName: "Millennium BIM",
  nib: "000100000102582039757",
  accountNumber: "1025820397",
} as const;

export const verificationPaymentProofSchema = z.object({
  method: z.enum(["bank_transfer", "mpesa", "emola", "card", "credits"]).default("bank_transfer"),
  // Comprovativo enviado pelo utilizador (ficheiro carregado via purpose "verification")
  fileId: z.string().min(1, "Comprovativo em falta"),
  url: z.string().min(1, "URL do comprovativo em falta"),
  name: z.string().trim().max(255).optional().default(""),
  // Referência/observação da transferência (opcional)
  reference: z.string().trim().max(128).optional().default(""),
});

export const verificationRequestSchema = z.object({
  profileId: z.string().min(1, "profileId obrigatório"),
  documents: z.array(verificationDocumentSchema).max(VERIFICATION_DOCUMENT_TYPES.length).default([]),
  // level1 = todos os documentos de registo legal; level2 = ainda em processo de legalização
  level: verificationLevelSchema.default("level1"),
  // Estatutos / BR (Boletim da República) — número de publicação do registo da empresa
  brNumber: z.string().trim().max(120).optional().default(""),
  // Comprovativo do pagamento do plano Workdeal Trust (transferência Millennium BIM)
  payment: verificationPaymentProofSchema.optional(),
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
export type VerificationPaymentProofInput = z.infer<typeof verificationPaymentProofSchema>;

// ── Painel admin ────────────────────────────────────────────────────────────

export type VerificationRequestStatus = z.infer<typeof verificationStatusSchema>;
export type VerificationRequestLevel = z.infer<typeof verificationLevelSchema>;

export const VERIFICATION_STATUS_LABELS_PT: Record<VerificationRequestStatus, string> = {
  pending: "Pendente",
  in_review: "Em análise",
  approved: "Aprovada",
  rejected: "Rejeitada",
};

export const VERIFICATION_LEVEL_LABELS_PT: Record<VerificationRequestLevel, string> = {
  level1: "1.º grau (legalizada)",
  level2: "2.º grau (em legalização)",
};

export const VERIFICATION_PAYMENT_METHOD_LABELS_PT: Record<string, string> = {
  bank_transfer: "Transferência bancária",
  mpesa: "M-Pesa",
  emola: "eMola",
  card: "Cartão",
  credits: "Créditos",
};

/** Vista de um pedido de verificação para o painel admin (com perfil/org resolvidos). */
export interface AdminVerificationView {
  id: string;
  profileId: string;
  profileName: string | null;
  profileType: "company" | "individual" | "institution" | string | null;
  profileSlug: string | null;
  organizationName: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  status: VerificationRequestStatus;
  level: VerificationRequestLevel;
  documents: VerificationDocumentInput[];
  brNumber: string | null;
  paymentProof: VerificationPaymentProofInput | null;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}