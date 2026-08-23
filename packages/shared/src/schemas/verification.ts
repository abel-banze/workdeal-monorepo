import { z } from "zod";

export const verificationStatusSchema = z.enum(["pending", "in_review", "approved", "rejected"]);
export const verificationListQuerySchema = z.object({
  status: verificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const verificationReviewSchema = z.object({
  reviewNote: z.string().trim().max(1000).optional(),
});

export type VerificationListQuery = z.infer<typeof verificationListQuerySchema>;
export type VerificationReviewInput = z.infer<typeof verificationReviewSchema>;
