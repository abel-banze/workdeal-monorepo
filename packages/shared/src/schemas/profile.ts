import { z } from "zod";
import { emailSchema } from "./auth.js";
import { businessHoursSchema } from "./business-hours.js";

export const profileTypeSchema = z.enum(["individual", "company"]);
export const profileStatusSchema = z.enum(["draft", "active", "suspended"]);

export const profileSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas minúsculas, números e hífens")
  .max(64);

export const contactFieldsSchema = {
  tagline: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  logoUrl: z.string().trim().url().max(512).nullable().optional(),
  coverUrl: z.string().trim().url().max(512).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  whatsapp: z.string().trim().max(32).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  email: emailSchema.nullable().optional(),
  website: z.string().trim().url().max(255).nullable().optional(),
  googlePlaceId: z.string().trim().min(1).max(512).nullable().optional(),
  formattedAddress: z.string().trim().max(500).nullable().optional(),
  businessHours: z.union([businessHoursSchema, z.record(z.string(), z.unknown())]).nullable().optional(),
};

export const categoryIdsSchema = z.array(z.string().min(1)).max(5).default([]);

export const createProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: profileSlugSchema.optional(),
  organizationId: z.string().min(1).optional(),
  categoryIds: categoryIdsSchema,
  ...contactFieldsSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: profileSlugSchema.optional(),
  status: profileStatusSchema.optional(),
  categoryIds: categoryIdsSchema.optional(),
  ...contactFieldsSchema,
});

export const profileCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  isPrimary: z.boolean(),
});

/** Badge compacto para listagens (company-card) — sem descrição/datas. */
export const profileBadgeLiteSchema = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.string(),
});

export const profileViewSchema = z.object({
  id: z.string(),
  type: profileTypeSchema,
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  whatsapp: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  googlePlaceId: z.string().nullable(),
  formattedAddress: z.string().nullable(),
  businessHours: z.record(z.string(), z.unknown()).nullable(),
  status: profileStatusSchema,
  categories: z.array(profileCategorySchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Extras de listagem/pesquisa (não canónicos): distância ao utilizador,
  // sede (província/distrito) e badges ativos — usados pelo ProfileCard.
  distanceKm: z.number().nullable().optional(),
  province: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  badges: z.array(profileBadgeLiteSchema).optional(),
});

export const categorySchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});

export const listProfilesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "near deve ser 'lat,lng'")
    .optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).default(25).optional(),
  status: profileStatusSchema.default("active").optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
  sort: z.enum(["recent", "name", "distance"]).default("recent").optional(),
});

export type ListProfilesQuery = z.infer<typeof listProfilesQuerySchema>;

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ProfileView = z.infer<typeof profileViewSchema>;
export type CategoryView = z.infer<typeof categorySchema>;
export type ProfileBadgeLite = z.infer<typeof profileBadgeLiteSchema>;

// --- Public profile (página /profiles/:slug) ---

export const publicLocationSchema = z.object({
  province: z.string().nullable(),
  district: z.string().nullable(),
  bairro: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  formattedAddress: z.string().nullable(),
});

export const publicQualificationSchema = z.object({
  foundedYear: z.number().nullable(),
  companySize: z.string().nullable(),
  workers: z.number().nullable(),
  legalForm: z.string().nullable(),
  nuit: z.string().nullable(),
  alvara: z.string().nullable(),
});

export const publicBadgeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string(),
  status: z.string(),
  awardedAt: z.date(),
});

export const publicReviewsSchema = z.object({
  average: z.number().nullable(),
  count: z.number(),
});

export const publicServiceSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  priceMzn: z.number().nullable(),
  imageUrl: z.string().nullable(),
  categoryId: z.string().nullable(),
});

export const publicContactVerificationSchema = z.object({
  channel: z.enum(["whatsapp", "phone", "email", "website"]),
  identifier: z.string(),
  verifiedAt: z.date(),
});

export const publicProfileViewSchema = profileViewSchema.extend({
  location: publicLocationSchema.nullable(),
  qualification: publicQualificationSchema.nullable(),
  badges: publicBadgeSchema.array(),
  reviews: publicReviewsSchema,
  services: publicServiceSchema.array(),
  contactVerifications: publicContactVerificationSchema.array(),
});

export type PublicProfileView = z.infer<typeof publicProfileViewSchema>;
export type PublicBadge = z.infer<typeof publicBadgeSchema>;
export type PublicService = z.infer<typeof publicServiceSchema>;
export type PublicContactVerification = z.infer<typeof publicContactVerificationSchema>;

