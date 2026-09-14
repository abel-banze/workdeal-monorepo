import { resend, EMAIL_FROM } from "../lib/resend.js";
import { negotiationsRepository } from "../repositories/negotiations.repository.js";
import type { SenderSide } from "@workdeal/shared";

export interface NotifyNewMessageParams {
  threadId: string;
  providerProfileId: string;
  requesterUserId: string;
  recipientSide: SenderSide;
  senderName: string;
  body: string;
  isOffer: boolean;
}

const WEB_ORIGIN = "https://workdeal.co.mz";

/**
 * Notifica o lado contrário por email quando há uma nova mensagem.
 * Best-effort e não bloqueante: falhas de envio não devem falhar a mutação.
 */
export async function notifyNewNegotiationMessage(params: NotifyNewMessageParams): Promise<{ ok: boolean; reason?: string }> {
  const recipient = await negotiationsRepository.findNotificationRecipient(params.providerProfileId, params.requesterUserId, params.recipientSide);
  if (!recipient?.email) return { ok: false, reason: "NO_RECIPIENT" };

  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "RESEND_API_KEY em falta" };
    }
    console.warn("[Negociação] RESEND_API_KEY não configurado — email mock");
    console.log(`[Negociação email mock] nova mensagem para ${recipient.email}`);
    return { ok: true };
  }

  const label = params.recipientSide === "provider" ? "fornecedor" : "solicitante";
  const subject = params.isOffer
    ? `Nova contraproposta na negociação #${params.threadId.slice(0, 8)}`
    : `Nova mensagem na negociação #${params.threadId.slice(0, 8)}`;
  const threadUrl = `${WEB_ORIGIN}/dashboard/negotiations/${params.threadId}`;
  const preview = (params.body || (params.isOffer ? "(contraproposta)" : "(sem texto)")).slice(0, 160);

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0B0E14">
    <h2 style="margin:0 0 8px;font-size:20px">Nova mensagem de ${escapeHtml(params.senderName)}</h2>
    <p style="color:#5B6B83;margin:0 0 16px">Negociação entre solicitante e ${label} · pedido de serviço</p>
    <div style="border-left:4px solid #F59E0B;padding:12px 16px;background:#F5F1E8;border-radius:8px;margin-bottom:16px">
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(preview)}</p>
    </div>
    <a href="${threadUrl}" style="display:inline-block;background:#F59E0B;color:#0B0E14;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px">Abrir negociação</a>
  </div>`;

  try {
    await resend.emails.send({ from: EMAIL_FROM, to: recipient.email, subject, html });
    return { ok: true };
  } catch (err) {
    console.error("[Negociação] falha ao enviar email de notificação", err instanceof Error ? err.message : String(err));
    return { ok: false, reason: "SEND_FAILED" };
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}