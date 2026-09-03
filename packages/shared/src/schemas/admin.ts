import { z } from "zod";
import { SYSTEM_ROLES } from "../types.js";
import { NOTIFY_CHANNELS } from "./pre-register.js";

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

const preRegisterBaseSchema = z.object({
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
  // Localização — coordenadas + província/cidade (persistidas no metadata JSON).
  // Capturadas automaticamente via Google Places details, mas editáveis.
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  province: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  // Logo (URL) e categorias (slugs) — persistidos no metadata JSON do pre-registo
  logoUrl: z.string().trim().url().max(1000).optional(),
  categorySlugs: z.array(z.string().trim().min(1).max(100)).max(10).optional(),
  // Canais de notificação (email, sms, whatsapp) — enviados à empresa após o pré-registo.
  // Persistidos no metadata JSON para reenvio e edição respeitarem a escolha.
  notifyChannels: z.array(z.enum(NOTIFY_CHANNELS)).min(1).max(3).optional(),
});

// Criação de pré-registo — name/slug/contact obrigatórios
export const preRegisterCompanySchema = preRegisterBaseSchema;

// Edição de pré-registo — todos os campos opcionais, com a possibilidade
// de limpar logo (logoUrl: null) e categorias (categorySlugs: null)
export const preRegisterUpdateSchema = preRegisterBaseSchema
  .partial()
  .extend({
    logoUrl: z.string().trim().url().max(1000).optional().nullable(),
    categorySlugs: z.array(z.string().trim().min(1).max(100)).max(10).optional().nullable(),
  });

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminOrgListQuery = z.infer<typeof adminOrgListQuerySchema>;
export type AdminUpdateUserRoleInput = z.infer<typeof adminUpdateUserRoleSchema>;
export type AdminUpdateOrgStatusInput = z.infer<typeof adminUpdateOrgStatusSchema>;
export type PreRegisterCompanyInput = z.infer<typeof preRegisterCompanySchema>;
export type PreRegisterUpdateInput = z.infer<typeof preRegisterUpdateSchema>;
