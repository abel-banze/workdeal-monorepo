import { z } from "zod";
import { createProfileSchema } from "./profile.js";
import { companyQualificationSchema } from "./company.js";

// Payload único do POST /api/v1/onboarding/complete — o orquestrador transacional
// do onboarding. Validação TOTAL acontece antes de qualquer escrita.

export const onboardingCompleteSchema = z.object({
  organizationId: z.string().min(1, "Organização obrigatória"),
  profile: createProfileSchema.omit({ organizationId: true }).extend({
    categoryIds: z.array(z.string().min(1)).min(1, "Escolhe pelo menos 1 categoria").max(5),
  }),
  qualification: companyQualificationSchema.nullable().optional(),
  location: z
    .object({
      province: z.string().trim().min(1).max(64),
      district: z.string().trim().max(64).nullable().optional(),
      bairro: z.string().trim().max(64).nullable().optional(),
      address: z.string().trim().max(255).nullable().optional(),
      latitude: z.number().min(-90).max(90).nullable().optional(),
      longitude: z.number().min(-180).max(180).nullable().optional(),
      visibility: z.enum(["exact", "zone"]).default("zone"),
    })
    .nullable()
    .optional(),
  tagSlugs: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
});

export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
