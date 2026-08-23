import { Resend } from "resend";

const rawKey = process.env.RESEND_API_KEY?.trim().replace(/^["']|["']$/g, "");
const apiKey = rawKey && rawKey.startsWith("re_") ? rawKey : rawKey || undefined;

if (!apiKey) {
  console.warn("[Email] RESEND_API_KEY em falta — mock (sem envio real)");
} else if (!apiKey.startsWith("re_")) {
  console.warn(`[Email] RESEND_API_KEY com formato inválido (esperado re_...): ${apiKey.slice(0, 8)}...`);
}

export const resend = apiKey && apiKey.startsWith("re_") ? new Resend(apiKey) : null;

export const EMAIL_FROM = "Workdeal <noreply@codebaz.cloud>";
