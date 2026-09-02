import { z } from "zod";
import { SYSTEM_ROLES } from "../types.js";

export const adminUserListQuerySchema = z.object({
  role: z.enum(SYSTEM_ROLES).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const adminOrgListQuerySchema = z.object({
  verificationStatus: z.enum(["pre_registered", "pending", "in_review", "verified", "suspended"]).optional(),
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

export const preRegisterCompanySchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  contactName: z.string().trim().min(2).max(200),
  contactPhone: z.string().trim().min(9).max(20),
  contactEmail: z.string().trim().email().optional(),
  googlePlaceId: z.string().trim().max(200).optional(),
  formattedAddress: z.string().trim().max(500).optional(),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminOrgListQuery = z.infer<typeof adminOrgListQuerySchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminUpdateOrgStatusInput = z.infer<typeof adminUpdateOrgStatusSchema>;
export type PreRegisterCompanyInput = z.infer<typeof preRegisterCompanySchema>;
