import { z } from "zod";

export const reviewOriginSchema = z.enum(["directory", "task", "event"]);

export const createReviewSchema = z.object({
  profileId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  origin: reviewOriginSchema.default("directory"),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional().nullable(),
});

export const reviewViewSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  authorUserId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  origin: reviewOriginSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ReviewView = z.infer<typeof reviewViewSchema>;
