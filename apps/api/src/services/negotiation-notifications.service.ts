import { negotiationsRepository } from "../repositories/negotiations.repository.js";
import { negotiationMessageHtml, negotiationOfferHtml } from "@workdeal/shared/lib/email-templates";
import type { SenderSide } from "@workdeal/shared";

export interface NotifyNewMessageParams {
  threadId: string;
  taskId: string;
  requesterOrganizationId: string | null;
  providerProfileId: string;
  requesterUserId: string;
  recipientSide: SenderSide;
  senderName: string;
  body: string;
  isOffer: boolean;
}

export interface NotifyOfferResponseParams {
  threadId: string;
  taskId: string;
  requesterOrganizationId: string | null;
  providerProfileId: string;
  requesterUserId: string;
  recipientSide: SenderSide;
  decision: "accepted" | "rejected";
  priceMzn: number | null;
  estimatedDays: number | null;
}

const WEB_ORIGIN = "https://workdeal.co.mz";

/** Destino real por lado: tarefa do solicitante, oportunidades do proponente. */
function threadUrl(taskId: string, requesterOrganizationId: string | null, recipientSide: SenderSide): string {
  if (recipientSide === "requester") {
    return `${WEB_ORIGIN}/dashboard/${requesterOrganizationId ?? "personal"}/tasks/${taskId}`;
  }
  return `${WEB_ORIGIN}/dashboard/personal/opportunities`;
}

/**
 * Notifica o lado contrário por email quando há uma nova mensagem.
 * Passa pelo dispatcher central: regista no inbox e respeita as
 * preferências da empresa. Best-effort e não bloqueante.
 */
export async function notifyNewNegotiationMessage(params: NotifyNewMessageParams): Promise<{ ok: boolean; reason?: string }> {
  const recipient = await negotiationsRepository.findNotificationRecipient(params.providerProfileId, params.requesterUserId, params.recipientSide);
  if (!recipient?.email) return { ok: false, reason: "NO_RECIPIENT" };

  const label = params.recipientSide === "provider" ? "fornecedor" : "solicitante";
  const subject = params.isOffer
    ? `Nova contraproposta na negociação #${params.threadId.slice(0, 8)}`
    : `Nova mensagem na negociação #${params.threadId.slice(0, 8)}`;
  const url = threadUrl(params.taskId, params.requesterOrganizationId, params.recipientSide);
  const preview = (params.body || (params.isOffer ? "(contraproposta)" : "(sem texto)")).slice(0, 160);

  const html = negotiationMessageHtml({ senderName: params.senderName, label, preview, url });

  const { notificationsService } = await import("./notifications.service.js");
  const res = await notificationsService.dispatch({
    organizationId: params.recipientSide === "requester" ? params.requesterOrganizationId : recipient.organizationId,
    userIds: recipient.userId ? [recipient.userId] : [],
    type: "negotiation_message",
    title: subject,
    body: preview,
    link: url,
    email: { to: recipient.email, subject, html },
    metadata: { threadId: params.threadId, taskId: params.taskId },
  });
  if (res.channels.email === "sent") return { ok: true };
  return { ok: false, reason: res.channels.email === "skipped" ? "OPTED_OUT" : "SEND_FAILED" };
}

/**
 * Notifica o autor da contraproposta quando o outro lado a aceita ou recusa.
 * Best-effort e não bloqueante, como as restantes notificações.
 */
export async function notifyOfferResponse(params: NotifyOfferResponseParams): Promise<{ ok: boolean; reason?: string }> {
  const recipient = await negotiationsRepository.findNotificationRecipient(params.providerProfileId, params.requesterUserId, params.recipientSide);
  if (!recipient?.email) return { ok: false, reason: "NO_RECIPIENT" };

  const accepted = params.decision === "accepted";
  const subject = accepted
    ? `Contraproposta aceite na negociação #${params.threadId.slice(0, 8)}`
    : `Contraproposta recusada na negociação #${params.threadId.slice(0, 8)}`;
  const url = threadUrl(params.taskId, params.requesterOrganizationId, params.recipientSide);
  const terms =
    params.priceMzn != null
      ? `${params.priceMzn.toLocaleString("pt-MZ")} MZN${params.estimatedDays != null ? ` · ~${params.estimatedDays} dias` : ""}`
      : "termos propostos";

  const html = negotiationOfferHtml({
    accepted,
    terms,
    note: accepted
      ? "Os termos foram actualizados na proposta. A negociação continua até à adjudicação."
      : "Pode enviar uma nova contraproposta para continuar a negociar.",
    url,
  });

  const { notificationsService } = await import("./notifications.service.js");
  const res = await notificationsService.dispatch({
    organizationId: params.recipientSide === "requester" ? params.requesterOrganizationId : recipient.organizationId,
    userIds: recipient.userId ? [recipient.userId] : [],
    type: "negotiation_offer",
    title: subject,
    body: terms,
    link: url,
    email: { to: recipient.email, subject, html },
    metadata: { threadId: params.threadId, taskId: params.taskId, decision: params.decision },
  });
  if (res.channels.email === "sent") return { ok: true };
  return { ok: false, reason: res.channels.email === "skipped" ? "OPTED_OUT" : "SEND_FAILED" };
}