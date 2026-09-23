import { z } from "zod";

// ── Tracking do funil de onboarding ────────────────────────────────
// Acções do utilizador durante o onboarding (passos 0-2 + conclusão).
// step: passo visível no momento do evento (0=Empresa, 1=Contactos, 2=Presença).

export const onboardingEventActionSchema = z.enum([
  "step_view",
  "step_next",
  "step_back",
  "validation_failed",
  "otp_requested",
  "otp_verified",
  "otp_failed",
  "company_created",
  "company_create_failed",
  "draft_restored",
  "onboarding_abandoned",
]);

export type OnboardingEventAction = z.infer<typeof onboardingEventActionSchema>;

export const trackOnboardingEventSchema = z.object({
  action: onboardingEventActionSchema,
  step: z.number().int().min(0).max(3).nullable().optional(),
  visitorId: z.string().trim().max(64).nullable().optional(),
  // validation_failed: { fields: string[] }; otp_*: { channel };
  // company_create_failed: { error }; onboarding_abandoned: { elapsedSeconds }
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type TrackOnboardingEventInput = z.infer<typeof trackOnboardingEventSchema>;

export const onboardingFunnelQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export type OnboardingFunnelQuery = z.infer<typeof onboardingFunnelQuerySchema>;

export const onboardingEventsQuerySchema = z.object({
  action: onboardingEventActionSchema.optional(),
  step: z.coerce.number().int().min(0).max(3).optional(),
  days: z.coerce.number().int().min(1).max(90).default(30),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type OnboardingEventsQuery = z.infer<typeof onboardingEventsQuerySchema>;

export const ONBOARDING_STEP_LABELS_PT: Record<number, string> = {
  0: "Empresa",
  1: "Contactos",
  2: "Presença",
};

export const ONBOARDING_ACTION_LABELS_PT: Record<OnboardingEventAction, string> = {
  step_view: "Passo visto",
  step_next: "Avançou",
  step_back: "Recuou",
  validation_failed: "Validação falhou",
  otp_requested: "OTP enviado",
  otp_verified: "OTP verificado",
  otp_failed: "OTP falhou",
  company_created: "Empresa criada",
  company_create_failed: "Criação falhou",
  draft_restored: "Rascunho retomado",
  onboarding_abandoned: "Abandonou",
};
