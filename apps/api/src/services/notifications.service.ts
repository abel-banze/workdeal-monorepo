import { sendEmail, sendSms, sendWhatsappTemplate, type ChannelOutcome } from "../lib/channels.js";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationListQuery, type NotificationPrefs, type NotificationType } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { notificationsRepository } from "../repositories/notifications.repository.js";
import { organizationsRepository } from "../repositories/organizations.repository.js";
import type { AuthUser } from "@workdeal/shared";

export type DispatchEmail = { to: string; subject: string; html: string };
export type DispatchWhatsapp = { toDigits: string; templateName: string; templateParams: string[] };
export type DispatchSms = { toDigits: string; message: string };

export type DispatchInput = {
  organizationId?: string | null;
  /** Destinatários do inbox (linhas individuais, cada um com o seu estado de leitura). */
  userIds?: string[];
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  email?: DispatchEmail | null;
  whatsapp?: DispatchWhatsapp | null;
  sms?: DispatchSms | null;
  metadata?: Record<string, unknown> | null;
};

export type DispatchResult = { ok: boolean; channels: Record<string, ChannelOutcome>; ids: string[] };

async function resolvePrefs(organizationId?: string | null): Promise<NotificationPrefs> {
  if (!organizationId) return DEFAULT_NOTIFICATION_PREFS;
  const prefs = await organizationsRepository.getNotificationPrefs(organizationId).catch(() => null);
  return prefs ?? DEFAULT_NOTIFICATION_PREFS;
}

export const notificationsService = {
  /**
   * Dispatcher central: cria o registo (inbox) e tenta os canais externos
   * conforme as preferências da empresa. Total — nunca lança.
   */
  async dispatch(input: DispatchInput): Promise<DispatchResult> {
    try {
      if (!input.organizationId && (!input.userIds || input.userIds.length === 0)) {
        throw new AppError(400, "NO_RECIPIENT", "Notificação sem destinatário");
      }
      const prefs = await resolvePrefs(input.organizationId);
      const channels: Record<string, ChannelOutcome> = { in_app: "sent" };
      const ids: string[] = [];

      // Inbox: uma linha por utilizador; sem utilizadores, uma linha da organização
      const recipients = input.userIds && input.userIds.length > 0 ? input.userIds : [null];
      for (const uid of recipients) {
        const row = await notificationsRepository.create({
          recipientUserId: uid,
          recipientOrganizationId: input.organizationId ?? null,
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          link: input.link ?? null,
          metadata: { ...(input.metadata ?? {}), channels },
        });
        if (row) ids.push(row.id);
      }

      if (input.email && prefs.email) {
        channels.email = (await sendEmail(input.email)).outcome;
      } else if (input.email) {
        channels.email = "skipped";
      }
      if (input.whatsapp && prefs.whatsapp) {
        channels.whatsapp = (await sendWhatsappTemplate({ to: input.whatsapp.toDigits, templateName: input.whatsapp.templateName, templateParams: input.whatsapp.templateParams })).outcome;
      } else if (input.whatsapp) {
        channels.whatsapp = "skipped";
      }
      if (input.sms && prefs.sms) {
        channels.sms = (await sendSms({ to: input.sms.toDigits, message: input.sms.message })).outcome;
      } else if (input.sms) {
        channels.sms = "skipped";
      }

      // Carimba o resultado dos canais em todas as linhas criadas
      for (const id of ids) {
        await notificationsRepository.updateMetadata(id, { ...(input.metadata ?? {}), channels }).catch(() => null);
      }
      const ok = Object.values(channels).every((c) => c !== "failed");
      return { ok, channels, ids };
    } catch (e) {
      console.error("[notifications dispatch] falha:", e instanceof Error ? e.message : String(e));
      return { ok: false, channels: { in_app: "failed" }, ids: [] };
    }
  },

  // ── Inbox ──────────────────────────────────────────────────────
  async list(user: AuthUser, query: NotificationListQuery) {
    const orgIds = await notificationsRepository.listMemberOrgIds(user.id);
    const { items, total } = await notificationsRepository.list(user.id, orgIds, {
      unreadOnly: query.unreadOnly,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return { items, total, page: query.page ?? 1, limit: query.limit ?? 20 };
  },

  async unreadCount(user: AuthUser) {
    const orgIds = await notificationsRepository.listMemberOrgIds(user.id);
    return { unread: await notificationsRepository.countUnread(user.id, orgIds) };
  },

  async markRead(user: AuthUser, id: string) {
    const row = await notificationsRepository.findById(id);
    if (!row) throw new AppError(404, "NOTIFICATION_NOT_FOUND", "Notificação não encontrada");
    await this.assertInboxAccess(user, row);
    return notificationsRepository.markRead(id);
  },

  async markAllRead(user: AuthUser) {
    const orgIds = await notificationsRepository.listMemberOrgIds(user.id);
    return { updated: await notificationsRepository.markAllRead(user.id, orgIds) };
  },

  async assertInboxAccess(user: AuthUser, row: { recipientUserId: string | null; recipientOrganizationId: string | null }) {
    if (row.recipientUserId === user.id) return;
    if (row.recipientOrganizationId) {
      const role = await getOrgRole(user.id, row.recipientOrganizationId);
      if (role) return;
    }
    throw new AppError(403, "FORBIDDEN", "Sem acesso a esta notificação");
  },
};
