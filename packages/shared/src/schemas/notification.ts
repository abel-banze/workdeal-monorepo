import { z } from "zod";

// ── Notificações (inbox + registo multicanal) ────────────────────────

export const notificationChannelSchema = z.enum(["in_app", "email", "whatsapp", "sms"]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const notificationTypeSchema = z.enum([
  "quote_received",
  "proposal_received",
  "proposal_shortlisted",
  "proposal_rejected",
  "bid_awarded",
  "bid_update",
  "event_registered",
  "event_interest",
  "negotiation_message",
  "negotiation_offer",
  "verification_update",
  "team_invite",
  "support_reply",
  "admin_notice",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationStatusSchema = z.enum(["unread", "read"]);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

export const NOTIFICATION_TYPE_LABELS_PT: Record<NotificationType, string> = {
  quote_received: "Cotação recebida",
  proposal_received: "Proposta recebida",
  proposal_shortlisted: "Proposta pré-seleccionada",
  proposal_rejected: "Proposta recusada",
  bid_awarded: "Adjudicação",
  bid_update: "Actualização da adjudicação",
  event_registered: "Inscrição em evento",
  event_interest: "Interesse em evento",
  negotiation_message: "Nova mensagem",
  negotiation_offer: "Contraproposta",
  verification_update: "Verificação",
  team_invite: "Convite de equipa",
  support_reply: "Resposta do suporte",
  admin_notice: "Aviso Workdeal",
};

export const notificationViewSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  status: notificationStatusSchema,
  createdAt: z.date(),
});

export type NotificationView = z.infer<typeof notificationViewSchema>;

export const notificationListQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
