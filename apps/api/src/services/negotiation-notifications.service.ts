import { negotiationsRepository } from "../repositories/negotiations.repository.js";
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

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B0E14">
    <h2 style="margin:0 0 8px;font-size:20px">Nova mensagem de ${escapeHtml(params.senderName)}</h2>
    <p style="color:#5B6B83;margin:0 0 16px">Negociação entre solicitante e ${label} · pedido de serviço</p>
    <div style="border-left:4px solid #F59E0B;padding:12px 16px;background:#F5F1E8;border-radius:8px;margin-bottom:16px">
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(preview)}</p>
    </div>
    <a href="${url}" style="display:inline-block;background:#F59E0B;color:#0B0E14;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Abrir negociação</a>
  </div>`;

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

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B0E14">
    <h2 style="margin:0 0 8px;font-size:20px">${accepted ? "Contraproposta aceite" : "Contraproposta recusada"}</h2>
    <div style="border-left:4px solid ${accepted ? "#0B5E56" : "#B91C1C"};padding:12px 16px;background:#F5F1E8;border-radius:8px;margin-bottom:16px">
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(terms)}</p>
    </div>
    <p style="color:#5B6B83;margin:0 0 16px">${
      accepted
        ? "Os termos foram actualizados na proposta. A negociação continua até à adjudicação."
        : "Pode enviar uma nova contraproposta para continuar a negociar."
    }</p>
    <a href="${url}" style="display:inline-block;background:#F59E0B;color:#0B0E14;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Abrir negociação</a>
  </div>`;

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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}