import { resend, EMAIL_FROM } from "../lib/resend.js";
import { otpEmailHtml, welcomeAccountHtml, welcomeCompanyHtml, resetPasswordHtml } from "@workdeal/shared/lib/email-templates";

export interface SendOtpEmailParams {
  to: string;
  code: string;
  brandName?: string;
}

export async function sendOtpEmail({ to, code, brandName = "Workdeal" }: SendOtpEmailParams) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false as const, error: "RESEND_API_KEY em falta no servidor — email não configurado" };
    }
    console.warn("[Email] RESEND_API_KEY não configurado — mock (sem envio real)");
    console.log(`[Email OTP mock] ${code} para ${to}`);
    return { ok: true as const };
  }

  console.log(`[Email] Enviando OTP para ${to} via Resend (from=${EMAIL_FROM})`);

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${code} — Código de verificação Workdeal`,
      html: otpEmailHtml(code, brandName),
    });

    if (error) {
      // Resend retorna { name, message } — ex: "invalid_api_key", "Domain not verified"
      console.error("[Email] Resend error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }

    if (!data?.id) {
      console.error("[Email] Resend resposta sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta do Resend sem id — verifique domínio verificado e API key" };
    }

    console.log(`[Email] OTP enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha ao enviar:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}

export interface SendContactEmailParams {
  to: string;
  fromName: string;
  fromEmail: string;
  message: string;
  profileName?: string;
}

function contactEmailHtml(fromName: string, fromEmail: string, message: string, profileName: string): string {
  return `<!DOCTYPE html><html lang="pt-MZ"><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#F6F3EE;font-family:Inter,Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F3EE;padding:32px 16px"><tr><td align="center"><table width="100%" style="max-width:520px;background:#fff;border:1px solid #D9D2C2;border-radius:16px;overflow:hidden"><tr><td style="padding:28px"><p style="font-size:11px;letter-spacing:0.14em;color:#0B5E56;font-weight:700;text-transform:uppercase;margin:0 0 8px">Contacto via Workdeal</p><h1 style="margin:0 0 8px;font-size:18px;font-weight:900;color:#0F1A2E">${profileName} — novo contacto</h1><p style="font-size:13px;color:#0F1A2E;opacity:0.7;margin:0 0 16px">De <strong>${fromName}</strong> &lt;${fromEmail}&gt; via perfil no Workdeal.</p><div style="background:#F6F3EE;border:1px solid #D9D2C2;border-radius:12px;padding:16px;font-size:14px;line-height:1.6;color:#0F1A2E;white-space:pre-wrap">${message.replace(/</g, "&lt;")}</div><p style="font-size:12px;color:#0F1A2E;opacity:0.5;margin:16px 0 0">Responda directamente para ${fromEmail}. Mensagem enviada via Workdeal.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendContactEmail({ to, fromName, fromEmail, message, profileName = "Workdeal" }: SendContactEmailParams) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false as const, error: "RESEND_API_KEY em falta no servidor — email não configurado" };
    }
    console.warn("[Email] RESEND_API_KEY não configurado — mock contacto");
    console.log(`[Email contacto mock] de ${fromName} <${fromEmail}> para ${to}: ${message.slice(0, 120)}`);
    return { ok: true as const };
  }
  console.log(`[Email] Enviando contacto para ${to} de ${fromEmail} via Resend`);
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: fromEmail,
      subject: `Contacto via Workdeal — ${fromName}`,
      html: contactEmailHtml(fromName, fromEmail, message, profileName),
    });
    if (error) {
      console.error("[Email] Resend contacto error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }
    if (!data?.id) {
      console.error("[Email] Resend contacto sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta sem id" };
    }
    console.log(`[Email] Contacto enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha contacto:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}

export interface SendWelcomeAccountParams {
  to: string;
  name: string;
  ctaUrl?: string;
}

export async function sendWelcomeAccountEmail({ to, name, ctaUrl }: SendWelcomeAccountParams) {
  const webOrigin = (process.env.ALLOWED_ORIGINS?.split(",")[0]?.trim() ?? "https://workdeal.co.mz").replace(/\/+$/, "");
  const url = ctaUrl ?? `${webOrigin}/onboarding`;
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY não configurado — mock welcome conta");
    console.log(`[Email welcome conta mock] para ${to} (${name}) -> ${url}`);
    return { ok: true as const };
  }
  console.log(`[Email] Enviando boas-vindas conta para ${to}`);
  try {
    const sendPromise = resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Bem-vindo ao Workdeal — a tua conta está pronta",
      html: welcomeAccountHtml({ name, ctaUrl: url }),
    });
    const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Resend timeout 8s")), 8000));
    const { data, error } = (await Promise.race([sendPromise, timeoutPromise])) as Awaited<typeof sendPromise>;
    if (error) {
      console.error("[Email] Resend welcome conta error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }
    if (!data?.id) {
      console.error("[Email] Resend welcome conta sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta sem id" };
    }
    console.log(`[Email] Welcome conta enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha welcome conta:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}

export interface SendWelcomeCompanyParams {
  to: string;
  name: string;
  companyName: string;
  profileSlug?: string;
  profileId?: string;
}

export async function sendWelcomeCompanyEmail({ to, name, companyName, profileSlug, profileId }: SendWelcomeCompanyParams) {
  const webOrigin = (process.env.ALLOWED_ORIGINS?.split(",")[0]?.trim() ?? "https://workdeal.co.mz").replace(/\/+$/, "");
  const slugOrId = profileSlug ?? profileId ?? "";
  const profileUrl = slugOrId ? `${webOrigin}/profiles/${slugOrId}` : `${webOrigin}/dashboard`;
  const dashboardUrl = `${webOrigin}/dashboard`;
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY não configurado — mock welcome empresa");
    console.log(`[Email welcome empresa mock] para ${to} (${companyName}) -> ${profileUrl}`);
    return { ok: true as const };
  }
  console.log(`[Email] Enviando boas-vindas empresa para ${to} (${companyName})`);
  try {
    const sendPromise = resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${companyName} está no ar — bem-vindo ao Workdeal`,
      html: welcomeCompanyHtml({ name, companyName, profileUrl, dashboardUrl }),
    });
    const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Resend timeout 8s")), 8000));
    const { data, error } = (await Promise.race([sendPromise, timeoutPromise])) as Awaited<typeof sendPromise>;
    if (error) {
      console.error("[Email] Resend welcome empresa error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }
    if (!data?.id) {
      console.error("[Email] Resend welcome empresa sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta sem id" };
    }
    console.log(`[Email] Welcome empresa enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha welcome empresa:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}

export interface SendResetPasswordParams {
  to: string;
  name?: string;
  resetUrl: string;
}

export async function sendResetPasswordEmail({ to, name, resetUrl }: SendResetPasswordParams) {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY não configurado — mock reset password");
    console.log(`[Email reset mock] para ${to} -> ${resetUrl}`);
    return { ok: true as const };
  }
  console.log(`[Email] Enviando reset password para ${to}`);
  try {
    const sendPromise = resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Redefine a tua palavra-passe — Workdeal",
      html: resetPasswordHtml({ name: name ?? "", resetUrl }),
    });
    const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Resend timeout 8s")), 8000));
    const { data, error } = (await Promise.race([sendPromise, timeoutPromise])) as Awaited<typeof sendPromise>;
    if (error) {
      console.error("[Email] Resend reset error:", JSON.stringify(error).slice(0, 800));
      const msg = (error as { message?: string })?.message || JSON.stringify(error).slice(0, 500);
      return { ok: false as const, error: msg };
    }
    if (!data?.id) {
      console.error("[Email] Resend reset sem id:", JSON.stringify(data).slice(0, 800));
      return { ok: false as const, error: "Resposta sem id" };
    }
    console.log(`[Email] Reset enviado para ${to} (id: ${data.id})`);
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Email] Falha reset:", msg.slice(0, 800));
    return { ok: false as const, error: msg };
  }
}
