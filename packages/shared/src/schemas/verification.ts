import { z } from "zod";

export const verificationStatusSchema = z.enum(["pending", "in_review", "approved", "rejected"]);
export const verificationLevelSchema = z.enum(["level1", "level2"]);
export const verificationListQuerySchema = z.object({
  status: verificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const verificationRequestSchema = z.object({
  profileId: z.string().min(1, "profileId obrigatório"),
  documents: z.array(z.unknown()).max(5).default([]),
  // level1 = todos os documentos de registo legal; level2 = ainda em processo de legalização
  level: verificationLevelSchema.default("level1"),
});

export const verificationReviewSchema = z.object({
  reviewNote: z.string().trim().max(1000).optional(),
});

export type VerificationListQuery = z.infer<typeof verificationListQuerySchema>;
export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>;
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;
