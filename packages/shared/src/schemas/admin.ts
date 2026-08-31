import { z } from "zod";
import { SYSTEM_ROLES } from "../types.js";

export const adminUserListQuerySchema = z.object({
  role: z.enum(SYSTEM_ROLES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const adminOrgListQuerySchema = z.object({
  verificationStatus: z.enum(["pending", "in_review", "verified", "suspended"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const adminUpdateUserRoleSchema = z.object({
  systemRole: z.enum(["user", "moderator", "admin"]),
});

export const adminUpdateOrgStatusSchema = z.object({
  verificationStatus: z.enum(["pending", "in_review", "verified", "suspended"]),
  note: z.string().trim().max(1000).optional(),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminOrgListQuery = z.infer<typeof adminOrgListQuerySchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminUpdateOrgStatusInput = z.infer<typeof adminUpdateOrgStatusSchema>;
