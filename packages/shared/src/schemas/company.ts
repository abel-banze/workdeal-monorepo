import { z } from "zod";
import { companySizeEnum, legalFormEnum } from "../lib/company-size.js";

export const companyQualificationSchema = z.object({
  workers: z.coerce.number().int().min(1).max(100000),
  turnoverMzn: z.coerce.number().int().min(0).max(1_000_000_000_000).nullable().optional(),
  foundedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  legalForm: legalFormEnum.nullable().optional(),
  nuit: z.string().trim().regex(/^[0-9]{9}$/, "NUIT deve ter 9 dígitos").nullable().optional().or(z.literal("")),
  alvara: z.string().trim().max(64).nullable().optional().or(z.literal("")),
  capitalSocialMzn: z.coerce.number().int().min(0).max(1_000_000_000_000).nullable().optional(),
  licenses: z.array(z.string().trim().min(2).max(120)).max(20).nullable().optional(),
  businessHours: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type CompanyQualificationInput = z.infer<typeof companyQualificationSchema>;

export const createCompanyProfileSchema = z.object({
  organizationId: z.string().min(1).optional(),
  profile: z.object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64).optional(),
    categoryIds: z.array(z.string().min(1)).min(1).max(5),
    whatsapp: z.string().trim().min(6).max(32),
    phone: z.string().trim().max(32).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    website: z.string().trim().url().max(255).nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    tagline: z.string().trim().max(160).nullable().optional(),
    province: z.string().trim().max(64).nullable().optional(),
    district: z.string().trim().max(64).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
  }),
  qualification: companyQualificationSchema,
});

export type CreateCompanyProfileInput = z.infer<typeof createCompanyProfileSchema>;
