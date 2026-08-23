import { z } from "zod";

export const tagSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  category: z.string().max(64).nullable().optional(),
});

export const createTagSchema = z.object({
  name: z.string().trim().min(2).max(64),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64).optional(),
  category: z.string().trim().max(64).nullable().optional(),
});

export const profileTagSchema = z.object({
  profileId: z.string().min(1),
  tagId: z.string().min(1),
});

export const locationSchema = z.object({
  province: z.string().trim().min(2).max(64),
  district: z.string().trim().max(64).nullable().optional(),
  bairro: z.string().trim().max(64).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  label: z.string().trim().max(64).nullable().optional(),
  isPrimary: z.boolean().optional(),
  visibility: z.enum(["exact", "zone"]).optional(),
});

export const createLocationSchema = locationSchema.extend({
  profileId: z.string().min(1),
  organizationId: z.string().min(1).nullable().optional(),
});

export type TagView = z.infer<typeof tagSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
