import { resend, EMAIL_FROM } from "../lib/resend.js";
import { preRegisterCompanyHtml } from "@workdeal/shared/lib/email-templates";

export interface PreRegisterNotifyInput {
  companyName: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  completionUrl: string;
  formattedAddress?: string | null;
}

/**
 * Notifica a empresa pré-registada via email, SMS e WhatsApp (fire-and-forget).
 * Todos os canais são non-blocking e com graceful mock fallback em dev —
 * o fim do pre-registo nunca deve falhar por causa de uma notificação.
 */
export async function notifyCompanyPreRegister(input: PreRegisterNotifyInput) {
  const emailResult = await sendEmail(input);
  const smsResult = await sendSms(input);
  const whatsappResult = await sendWhatsApp(input);
  return { email: emailResult, sms: smsResult, whatsapp: whatsappResult };
}

export const BASE_URL = "https://workdeal.co.mz";

export function webOrigin(): string {
  return BASE_URL;
}

export async function sendEmail(input: PreRegisterNotifyInput) {
  if (!input.contactEmail) {
    console.warn(`[pre-register email] sem contactEmail para ${input.companyName} — skip`);
    return { ok: true as const, skipped: true as const };
  }
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false as const, skipped: false as const, error: "RESEND_API_KEY em falta" };
    }
    console.warn("[Email] RESEND_API_KEY não configurado — mock pre-registo");
    console.log(`[Email pré-registo mock] para ${input.contactEmail} (${input.companyName}) -> ${input.completionUrl}`);
    return { ok: true as const, skipped: false as const };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: input.contactEmail,
      subject: `${input.companyName} — completa o teu registo no Workdeal`,
      html: preRegisterCompanyHtml({
        companyName: input.companyName,
        contactName: input.contactName,
        completionUrl: input.completionUrl,
        formattedAddress: input.formattedAddress,
      }),
    });
    if (error || !data?.id) {
      const msg = (error as { message?: string })?.message || "resposta sem id";
      console.error(`[Email pré-registo] falha: ${msg}`);
      return { ok: false as const, skipped: false as const, error: msg };
    }
    console.log(`[Email pré-registo] enviado para ${input.contactEmail} (id: ${data.id})`);
    return { ok: true as const, skipped: false as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email pré-registo] falha:", msg);
    return { ok: false as const, skipped: false as const, error: msg };
  }
}

export async function sendSms(input: PreRegisterNotifyInput) {
  if (!input.contactPhone) {
    console.warn(`[pre-register sms] sem contactPhone para ${input.companyName} — skip`);
    return { ok: true as const, skipped: true as const };
  }
  const token = process.env.SMS_USER_TOKEN;
  const digits = input.contactPhone.replace(/\D/g, "");
  const isProd = process.env.NODE_ENV === "production";
  if (!token) {
    if (isProd) return { ok: false as const, skipped: false as const, error: "SMS_USER_TOKEN em falta" };
    console.warn("[SMS] SMS_USER_TOKEN em falta — mock dev");
    console.log(`[SMS pré-registo mock] para +${digits}: ${input.companyName} — completa o registo em ${input.completionUrl}`);
    return { ok: true as const, skipped: false as const };
  }
  let url = (process.env.SMS_API_URL || "https://my.turbo.host/api/international-sms/submit").replace(/\/+$/, "");
  if (!url.endsWith("/submit")) url = `${url}/submit`;
  const message = `A Workdeal iniciou o registo da ${input.companyName}. Completa o teu perfil aqui: ${input.completionUrl}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_token: token, origin: "CODEBAZ", message, numbers: [`+${digits}`] }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    const data = text ? (JSON.parse(text) as { status?: string; message?: string }) : null;
    if (res.ok && data?.status === "successful") {
      console.log(`[SMS pré-registo] enviado para +${digits}`);
      return { ok: true as const, skipped: false as const };
    }
    console.warn(`[SMS pré-registo] falha ${res.status} ${(data?.message ?? text).slice(0, 300)}`);
    return isProd ? { ok: false as const, skipped: false as const, error: "falha SMS" } : { ok: true as const, skipped: false as const };
  } catch (e) {
    console.warn(`[SMS pré-registo] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    return isProd ? { ok: false as const, skipped: false as const, error: "falha SMS" } : { ok: true as const, skipped: false as const };
  }
}

export async function sendWhatsApp(input: PreRegisterNotifyInput) {
  if (!input.contactPhone) {
    console.warn(`[pre-register whatsapp] sem contactPhone para ${input.companyName} — skip`);
    return { ok: true as const, skipped: true as const };
  }
  const token = process.env.ZERNIO_API_KEY ?? process.env.WHATSAPP_API_TOKEN;
  const accountId = process.env.ZERNIO_PHONE_ID;
  const digits = input.contactPhone.replace(/\D/g, "");
  const isProd = process.env.NODE_ENV === "production";
  if (!token || !accountId) {
    if (isProd) return { ok: false as const, skipped: false as const, error: "ZERNIO_API_KEY/PHONE_ID em falta" };
    console.warn(`[pre-register whatsapp] ZERNIO em falta — mock: enviaria para +${digits} template onboarding_request ({{1}}=nome, {{2}}=link)`);
    return { ok: true as const, skipped: false as const };
  }
  const templateName = process.env.WHATSAPP_PREREGISTER_TEMPLATE ?? "onboarding_request";
  const templateLanguage = "pt_PT";
  try {
    const res = await fetch("https://zernio.com/api/v1/inbox/conversations", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        participantId: digits,
        templateName,
        templateLanguage,
        templateParams: [input.companyName, input.completionUrl],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[pre-register whatsapp] Zernio falhou ${res.status} ${text.slice(0, 800)}`);
      return isProd ? { ok: false as const, skipped: false as const, error: "falha WhatsApp" } : { ok: true as const, skipped: false as const };
    }
    console.log(`[pre-register whatsapp] enviado para +${digits} template ${templateName}`);
    return { ok: true as const, skipped: false as const };
  } catch (e) {
    console.warn(`[pre-register whatsapp] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    return isProd ? { ok: false as const, skipped: false as const, error: "falha WhatsApp" } : { ok: true as const, skipped: false as const };
  }
}

export const preRegisterNotificationService = { notifyCompanyPreRegister, webOrigin };
