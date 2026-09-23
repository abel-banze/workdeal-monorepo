import { resend, EMAIL_FROM } from "./resend.js";
import { normalizeMzPhone } from "@workdeal/shared/lib/phone";

// ── Senders únicos por canal ─────────────────────────────────────
// Uma função por canal (email, WhatsApp, SMS): credenciais, mock em dev,
// normalização e timeouts num só sítio. Nunca lançam — devolvem outcome.
// Usado pelo dispatcher de notificações e pelo pré-registo.

export type ChannelOutcome = "sent" | "skipped" | "failed";
export type ChannelResult = { outcome: ChannelOutcome; error?: string };

const isProd = () => process.env.NODE_ENV === "production";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<ChannelResult> {
  if (!to) return { outcome: "skipped" };
  if (!resend) {
    if (isProd()) return { outcome: "failed", error: "RESEND_API_KEY em falta" };
    console.warn(`[channels email mock] para ${to}: ${subject}`);
    return { outcome: "sent" };
  }
  try {
    const { data, error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
    if (error || !data?.id) {
      const msg = (error as { message?: string })?.message || "resposta sem id";
      console.error(`[channels email] falha: ${msg}`);
      return { outcome: "failed", error: msg };
    }
    return { outcome: "sent" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[channels email] falha:", msg);
    return { outcome: "failed", error: msg };
  }
}

export async function sendWhatsappTemplate({
  to,
  templateName,
  templateParams,
  language = "pt_PT",
}: {
  to: string;
  templateName: string;
  templateParams: string[];
  language?: string;
}): Promise<ChannelResult> {
  // Normalização canónica MZ (258XXXXXXXXX) — igual no pré-registo e no dispatcher.
  const digits = normalizeMzPhone(to);
  if (!digits) return { outcome: "skipped" };
  const token = process.env.ZERNIO_API_KEY ?? process.env.WHATSAPP_API_TOKEN;
  const accountId = process.env.ZERNIO_PHONE_ID;
  if (!token || !accountId) {
    if (isProd()) return { outcome: "failed", error: "ZERNIO_API_KEY/PHONE_ID em falta" };
    console.warn(`[channels whatsapp mock] para +${digits} template ${templateName}`);
    return { outcome: "sent" };
  }
  try {
    const res = await fetch("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, participantId: digits, templateName, templateLanguage: language, templateParams }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[channels whatsapp] Zernio falhou ${res.status} ${text.slice(0, 500)}`);
      return { outcome: "failed", error: "falha WhatsApp" };
    }
    console.log(`[channels whatsapp] enviado para +${digits} template ${templateName}`);
    return { outcome: "sent" };
  } catch (e) {
    console.warn(`[channels whatsapp] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    return { outcome: "failed", error: "falha WhatsApp" };
  }
}

export async function sendSms({ to, message, origin = "CODEBAZ" }: { to: string; message: string; origin?: string }): Promise<ChannelResult> {
  const digits = normalizeMzPhone(to);
  if (!digits) return { outcome: "skipped" };
  const token = process.env.SMS_USER_TOKEN;
  if (!token) {
    if (isProd()) return { outcome: "failed", error: "SMS_USER_TOKEN em falta" };
    console.warn("[channels sms mock] SMS_USER_TOKEN em falta");
    console.log(`[channels sms mock] para +${digits}: ${message.slice(0, 120)}`);
    return { outcome: "sent" };
  }
  let url = (process.env.SMS_API_URL || "https://my.turbo.host/api/international-sms/submit").replace(/\/+$/, "");
  if (!url.endsWith("/submit")) url = `${url}/submit`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_token: token, origin, message, numbers: [`+${digits}`] }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    const data = text ? (JSON.parse(text) as { status?: string; message?: string }) : null;
    if (res.ok && data?.status === "successful") {
      console.log(`[channels sms] enviado para +${digits}`);
      return { outcome: "sent" };
    }
    console.warn(`[channels sms] falha ${res.status} ${(data?.message ?? text).slice(0, 300)}`);
    return { outcome: "failed", error: "falha SMS" };
  } catch (e) {
    console.warn(`[channels sms] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    return { outcome: "failed", error: "falha SMS" };
  }
}
