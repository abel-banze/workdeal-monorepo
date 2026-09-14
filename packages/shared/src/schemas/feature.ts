import { z } from "zod";
import { FEATURE_KEYS } from "../features.js";

// ── Feature flags (controlo operacional) ───────────────────────────────────
// Gestão de flags: registo de cada flag, estado default (global) e kill-switch
// de emergência, mais sobreposições por organização.

export const featureKeySchema = z.enum(FEATURE_KEYS);

export const featureFlagSchema = z.object({
  key: featureKeySchema,
  name: z.string(),
  description: z.string().nullable(),
  defaultEnabled: z.boolean(),
  emergencyDisabled: z.boolean(),
  group: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type FeatureFlag = z.infer<typeof featureFlagSchema>;

// Criação de um flag novo. A chave tem de estar no catálogo partilhado.
export const featureFlagCreateSchema = z.object({
  key: featureKeySchema,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).nullable().optional(),
  defaultEnabled: z.boolean().default(false),
  group: z.string().trim().max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).default(100),
});
export type FeatureFlagCreateInput = z.infer<typeof featureFlagCreateSchema>;

// Actualização (a chave é imutável).
export const featureFlagUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(400).nullable().optional(),
  defaultEnabled: z.boolean().optional(),
  emergencyDisabled: z.boolean().optional(),
  group: z.string().trim().max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
export type FeatureFlagUpdateInput = z.infer<typeof featureFlagUpdateSchema>;

// Sobreposição por organização: vence o default global para essa org.
export const featureFlagOverrideSchema = z.object({
  id: z.string(),
  flagKey: featureKeySchema,
  organizationId: z.string(),
  enabled: z.boolean(),
  note: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});
export type FeatureFlagOverride = z.infer<typeof featureFlagOverrideSchema>;

export const featureFlagOverrideUpsertSchema = z.object({
  enabled: z.boolean(),
  note: z.string().trim().max(400).nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
export type FeatureFlagOverrideUpsertInput = z.infer<typeof featureFlagOverrideUpsertSchema>;

// Visão para o admin: flag + nº de sobreposições + estado global.
export const featureFlagAdminViewSchema = featureFlagSchema.extend({
  overridesCount: z.number().int().min(0),
});
export type FeatureFlagAdminView = z.infer<typeof featureFlagAdminViewSchema>;

// Visão pública simples (catálogo, sem sobreposições internas).
export const featureFlagPublicSchema = featureFlagSchema.omit({
  emergencyDisabled: true,
  sortOrder: true,
}).extend({
  // Estado global efectivo para o público (default, sem emergência).
  enabled: z.boolean(),
});
export type FeatureFlagPublic = z.infer<typeof featureFlagPublicSchema>;

export const featureFlagListQuerySchema = z.object({
  group: z.string().trim().max(64).optional(),
});
export type FeatureFlagListQuery = z.infer<typeof featureFlagListQuerySchema>;