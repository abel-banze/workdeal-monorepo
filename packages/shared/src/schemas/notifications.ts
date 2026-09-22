import { z } from "zod";

// ── Preferências de notificação da empresa ───────────────────────────
// Como a empresa quer ser notificada (cotações recebidas, alertas, etc.).
// Por defeito: email + WhatsApp ligados, SMS desligado.

export const notificationPrefsSchema = z.object({
  email: z.boolean(),
  whatsapp: z.boolean(),
  sms: z.boolean(),
});

export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  whatsapp: true,
  sms: false,
};

export const NOTIFICATION_PREFS_LABELS_PT: Record<keyof NotificationPrefs, { title: string; hint: string }> = {
  email: { title: "Email", hint: "Cotações e alertas no email de contacto" },
  whatsapp: { title: "WhatsApp", hint: "Mensagens rápidas no número da empresa" },
  sms: { title: "SMS", hint: "Apenas avisos urgentes por SMS" },
};
