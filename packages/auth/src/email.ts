import { Resend } from "resend";
import { welcomeAccountHtml, resetPasswordHtml } from "@workdeal/shared/lib/email-templates";
import { env } from "./env.js";

const rawKey = process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, "");
const apiKey = rawKey && rawKey.startsWith("re_") ? rawKey : rawKey || undefined;

export const resend = apiKey && apiKey.startsWith("re_") ? new Resend(apiKey) : null;
export const EMAIL_FROM = "Workdeal <noreply@codebaz.cloud>";

function webOrigin(): string {
  try {
    const origins = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
    return (origins[0] ?? "https://workdeal.co.mz").replace(/\/+$/, "");
  } catch {
    return "https://workdeal.co.mz";
  }
}

export async function sendWelcomeAccountEmailAuth(to: string, name: string): Promise<void> {
  const origin = webOrigin();
  const ctaUrl = `${origin}/onboarding`;
  if (!resend) {
    console.warn("[Auth Email] RESEND_API_KEY não configurado — mock welcome conta");
    console.log(`[Auth Email welcome mock] ${to} (${name}) -> ${ctaUrl}`);
    return;
  }
  try {
    const send = resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Bem-vindo ao Workdeal — a tua conta está pronta",
      html: welcomeAccountHtml({ name, ctaUrl }),
    });
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Resend timeout 8s")), 8000));
    const { data, error } = (await Promise.race([send, timeout])) as Awaited<typeof send>;
    if (error) {
      console.error("[Auth Email] Resend welcome error:", JSON.stringify(error).slice(0, 800));
      return;
    }
    if (data?.id) console.log(`[Auth Email] Welcome conta enviado para ${to} (id: ${data.id})`);
  } catch (e) {
    console.error("[Auth Email] Falha welcome:", e instanceof Error ? e.message : String(e));
  }
}

export async function sendResetPasswordEmailAuth(to: string, name: string, token: string, urlFromBetterAuth: string): Promise<void> {
  const origin = webOrigin();
  // better-auth gera url com base em BETTER_AUTH_URL (api). Substituímos pelo domínio web
  let resetUrl: string;
  try {
    // token já está no urlFromBetterAuth; extraímos ou usamos token directo
    const u = new URL(urlFromBetterAuth);
    const t = u.searchParams.get("token") ?? token;
    resetUrl = `${origin}/reset-password?token=${encodeURIComponent(t)}`;
  } catch {
    resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
  }

  if (!resend) {
    console.warn("[Auth Email] RESEND_API_KEY não configurado — mock reset");
    console.log(`[Auth Email reset mock] ${to} -> ${resetUrl}`);
    return;
  }
  try {
    const send = resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Redefine a tua palavra-passe — Workdeal",
      html: resetPasswordHtml({ name, resetUrl }),
    });
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Resend timeout 8s")), 8000));
    const { data, error } = (await Promise.race([send, timeout])) as Awaited<typeof send>;
    if (error) {
      console.error("[Auth Email] Resend reset error:", JSON.stringify(error).slice(0, 800));
      return;
    }
    if (data?.id) console.log(`[Auth Email] Reset enviado para ${to} (id: ${data.id})`);
  } catch (e) {
    console.error("[Auth Email] Falha reset:", e instanceof Error ? e.message : String(e));
  }
}
