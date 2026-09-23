import { resend, EMAIL_FROM } from "../lib/resend.js";
import { normalizeMzPhone } from "@workdeal/shared/lib/phone";
import { DEFAULT_NOTIFICATION_PREFS, type NotificationListQuery, type NotificationPrefs, type NotificationType } from "@workdeal/shared";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { notificationsRepository } from "../repositories/notifications.repository.js";
import { organizationsRepository } from "../repositories/organizations.repository.js";
import type { AuthUser } from "@workdeal/shared";

export type DispatchEmail = { to: string; subject: string; html: string };
export type DispatchWhatsapp = { toDigits: string; templateName: string; templateParams: string[] };

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
  metadata?: Record<string, unknown> | null;
};

export type ChannelOutcome = "sent" | "skipped" | "failed";
export type DispatchResult = { ok: boolean; channels: Record<string, ChannelOutcome>; ids: string[] };

const isProd = () => process.env.NODE_ENV === "production";

async function sendEmailPayload(payload: DispatchEmail): Promise<ChannelOutcome> {
  if (!resend) {
    if (isProd()) return "failed";
    console.warn(`[notifications email mock] para ${payload.to}: ${payload.subject}`);
    return "sent";
  }
  try {
    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to: payload.to, subject: payload.subject, html: payload.html });
    if (error || !data?.id) {
      console.error(`[notifications email] falha: ${(error as { message?: string })?.message ?? "resposta sem id"}`);
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error("[notifications email] falha:", e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

async function sendWhatsappPayload(payload: DispatchWhatsapp): Promise<ChannelOutcome> {
  const digits = normalizeMzPhone(payload.toDigits);
  if (!digits) return "skipped";
  const token = process.env.ZERNIO_API_KEY ?? process.env.WHATSAPP_API_TOKEN;
  const accountId = process.env.ZERNIO_PHONE_ID;
  if (!token || !accountId) {
    if (isProd()) return "failed";
    console.warn(`[notifications whatsapp mock] para +${digits} template ${payload.templateName}`);
    return "sent";
  }
  try {
    const res = await fetch("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        participantId: digits,
        templateName: payload.templateName,
        templateLanguage: "pt_PT",
        templateParams: payload.templateParams,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[notifications whatsapp] Zernio falhou ${res.status} ${text.slice(0, 500)}`);
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.error(`[notifications whatsapp] erro fetch:`, e instanceof Error ? e.message : String(e));
    return "failed";
  }
}

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
        channels.email = await sendEmailPayload(input.email);
      } else if (input.email) {
        channels.email = "skipped";
      }
      if (input.whatsapp && prefs.whatsapp) {
        channels.whatsapp = await sendWhatsappPayload(input.whatsapp);
      } else if (input.whatsapp) {
        channels.whatsapp = "skipped";
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
