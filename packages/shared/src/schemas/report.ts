import { z } from "zod";

export const reportTargetTypeSchema = z.enum(["profile", "review", "task", "event"]);
export const reportStatusSchema = z.enum(["pending", "resolved", "dismissed"]);

export const createReportSchema = z.object({
  targetType: reportTargetTypeSchema,
  targetId: z.string().min(1),
  reason: z.string().trim().min(5).max(200),
  details: z.string().trim().max(2000).optional().nullable(),
});

export const reportListQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const updateReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
