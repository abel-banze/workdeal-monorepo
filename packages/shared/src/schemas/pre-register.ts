import { z } from "zod";

export const NOTIFY_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

// Canais enviados por defeito: email e WhatsApp ligados; SMS desligado
// (o admin liga-o explicitamente no formulário de pré-registo).
export const DEFAULT_NOTIFY_CHANNELS: NotifyChannel[] = ["email", "whatsapp"];

// Dados visíveis publicamente através do token de completamento (sem auth).
export const preRegisterLookupSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  contactName: z.string().nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  formattedAddress: z.string().nullable(),
  logoUrl: z.string().nullable(),
  categorySlugs: z.array(z.string()).nullable(),
  metadata: z.string().nullable(),
  verificationStatus: z.string(),
  preRegisteredAt: z.string().nullable(),
});

export const completePreRegisterSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  phone: z.string().trim().min(9).max(20).optional(),
});

export type PreRegisterLookup = z.infer<typeof preRegisterLookupSchema>;
export type CompletePreRegisterInput = z.infer<typeof completePreRegisterSchema>;