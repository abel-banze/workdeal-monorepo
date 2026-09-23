import { sendEmail as sendEmailChannel, sendSms as sendSmsChannel, sendWhatsappTemplate } from "../lib/channels.js";
import { preRegisterCompanyHtml } from "@workdeal/shared/lib/email-templates";
import { DEFAULT_NOTIFY_CHANNELS, type NotifyChannel } from "@workdeal/shared/schemas/pre-register";

export interface PreRegisterNotifyInput {
  companyName: string;
  contactName: string;
  contactPhone?: string | null;
  contactEmail?: string | null;
  completionUrl: string;
  formattedAddress?: string | null;
  channels?: NotifyChannel[];
}

/**
 * Notifica a empresa pré-registada via canais seleccionados (fire-and-forget).
 * Por defeito envia email e WhatsApp — SMS fica desligado até o admin activar explicitamente.
 * Todos os canais são non-blocking e com graceful mock fallback em dev —
 * o fim do pre-registo nunca deve falhar por causa de uma notificação.
 */
export async function notifyCompanyPreRegister(input: PreRegisterNotifyInput) {
  const channels = input.channels ?? DEFAULT_NOTIFY_CHANNELS;
  const emailResult = channels.includes("email") ? await sendEmail(input) : { ok: true as const, skipped: true as const };
  const smsResult = channels.includes("sms") ? await sendSms(input) : { ok: true as const, skipped: true as const };
  const whatsappResult = channels.includes("whatsapp") ? await sendWhatsApp(input) : { ok: true as const, skipped: true as const };
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
  const result = await sendEmailChannel({
    to: input.contactEmail,
    subject: `${input.companyName} — completa o teu registo no Workdeal`,
    html: preRegisterCompanyHtml({
      companyName: input.companyName,
      contactName: input.contactName,
      completionUrl: input.completionUrl,
      formattedAddress: input.formattedAddress,
    }),
  });
  if (result.outcome === "sent") {
    console.log(`[Email pré-registo] enviado para ${input.contactEmail}`);
    return { ok: true as const, skipped: false as const };
  }
  return { ok: false as const, skipped: false as const, error: result.error ?? "falha Email" };
}

export async function sendSms(input: PreRegisterNotifyInput) {
  if (!input.contactPhone) {
    console.warn(`[pre-register sms] sem contactPhone para ${input.companyName} — skip`);
    return { ok: true as const, skipped: true as const };
  }
  const message = `A Workdeal iniciou o registo da ${input.companyName}. Completa o teu perfil aqui: ${input.completionUrl}`;
  const result = await sendSmsChannel({ to: input.contactPhone, message });
  if (result.outcome === "sent") return { ok: true as const, skipped: false as const };
  const isProd = process.env.NODE_ENV === "production";
  return isProd ? { ok: false as const, skipped: false as const, error: result.error ?? "falha SMS" } : { ok: true as const, skipped: false as const };
}

export async function sendWhatsApp(input: PreRegisterNotifyInput) {
  if (!input.contactPhone) {
    console.warn(`[pre-register whatsapp] sem contactPhone para ${input.companyName} — skip`);
    return { ok: true as const, skipped: true as const };
  }
  // Par ordenado: 1º apresentação do Workdeal (sem parâmetros), 2º convite
  // com nome+link. Se a apresentação falhar, não se envia o convite órfão.
  const isProd = process.env.NODE_ENV === "production";
  const introName = process.env.WHATSAPP_INTRODUCTION_TEMPLATE ?? "workdeal_introduction";
  const intro = await sendWhatsappTemplate({ to: input.contactPhone, templateName: introName, templateParams: [] });
  if (intro.outcome !== "sent") {
    console.warn(`[pre-register whatsapp] introdução falhou para ${input.companyName} — convite não enviado`);
    return isProd ? { ok: false as const, skipped: false as const, error: intro.error ?? "falha WhatsApp" } : { ok: true as const, skipped: false as const };
  }
  const templateName = process.env.WHATSAPP_PREREGISTER_TEMPLATE ?? "onboarding_request";
  const result = await sendWhatsappTemplate({
    to: input.contactPhone,
    templateName,
    templateParams: [input.companyName, input.completionUrl],
  });
  if (result.outcome === "sent") {
    console.log(`[pre-register whatsapp] enviado para ${input.companyName} template ${templateName} (após introdução)`);
    return { ok: true as const, skipped: false as const };
  }
  return isProd ? { ok: false as const, skipped: false as const, error: result.error ?? "falha WhatsApp" } : { ok: true as const, skipped: false as const };
}

export const preRegisterNotificationService = { notifyCompanyPreRegister, webOrigin };
