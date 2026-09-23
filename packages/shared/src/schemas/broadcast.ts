import { z } from "zod";

// ── Newsletter / difusão (admin) ─────────────────────────────────

export const broadcastChannelSchema = z.enum(["whatsapp", "email", "sms"]);
export type BroadcastChannel = z.infer<typeof broadcastChannelSchema>;

export const broadcastStatusSchema = z.enum(["draft", "ready", "sending", "sent"]);
export type BroadcastStatus = z.infer<typeof broadcastStatusSchema>;

export const BROADCAST_CHANNEL_LABELS_PT: Record<BroadcastChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
};

export const BROADCAST_STATUS_LABELS_PT: Record<BroadcastStatus, string> = {
  draft: "Rascunho",
  ready: "Pronta",
  sending: "A enviar",
  sent: "Enviada",
};

// Templates WhatsApp aprovados para difusão (têm de existir no Zernio).
// Parâmetro único {{1}} = nome da empresa (convenção dos disparos em massa).
export const BROADCAST_WHATSAPP_TEMPLATES = ["workdeal_introduction", "onboarding_request", "quote_request", "tasks_cta", "new_tenders"] as const;

export const createBroadcastCampaignSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter pelo menos 3 caracteres").max(160),
    channel: broadcastChannelSchema,
    templateKey: z.string().trim().min(1).max(80).nullable().optional(),
    subject: z.string().trim().max(160).nullable().optional(),
    bodyHtml: z.string().trim().max(20000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.channel === "email"
        ? Boolean(d.subject?.trim()) && Boolean(d.bodyHtml?.trim())
        : d.channel === "whatsapp"
          ? Boolean(d.templateKey?.trim())
          : Boolean(d.bodyHtml?.trim()),
    { message: "Email exige assunto + conteúdo; WhatsApp exige template; SMS exige mensagem", path: ["templateKey"] },
  );
export type CreateBroadcastCampaignInput = z.infer<typeof createBroadcastCampaignSchema>;

export const sendBroadcastBatchSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export type SendBroadcastBatchInput = z.infer<typeof sendBroadcastBatchSchema>;

export const broadcastListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type BroadcastListQuery = z.infer<typeof broadcastListQuerySchema>;

// Envio individual: empresa (resolve o contacto) ou endereço directo.
export const sendIndividualMessageSchema = z
  .object({
    organizationId: z.string().min(1).nullable().optional(),
    channel: broadcastChannelSchema,
    to: z.string().trim().max(120).nullable().optional(),
    templateKey: z.string().trim().min(1).max(80).nullable().optional(),
    subject: z.string().trim().max(160).nullable().optional(),
    body: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((d) => Boolean(d.organizationId) || Boolean(d.to?.trim()), {
    message: "Indica a empresa ou o endereço",
    path: ["to"],
  })
  .refine(
    (d) =>
      d.channel === "email"
        ? Boolean(d.subject?.trim()) && Boolean(d.body?.trim())
        : d.channel === "whatsapp"
          ? Boolean(d.templateKey?.trim())
          : Boolean(d.body?.trim()),
    { message: "Email exige assunto + conteúdo; WhatsApp exige template; SMS exige mensagem", path: ["templateKey"] },
  );
export type SendIndividualMessageInput = z.infer<typeof sendIndividualMessageSchema>;
