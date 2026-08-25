"use server";

import { createHash, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { and, desc, eq, lt } from "drizzle-orm";
import { db, otpChallenge } from "@workdeal/db";
import {
  contactIdentifier,
  normalizeMzPhone,
} from "@workdeal/shared/lib/phone";
import { getWebOrigin } from "@/lib/api";
import {
  signContactVerification,
  parseVerifiedContacts,
} from "@workdeal/shared/lib/contact-verification";

// OTP durável: desafios na tabela otp_challenge (multi-réplica/restart-safe),
// cooldown por identificador, falha explícita em prod sem provider e bind do
// contacto verificado via cookie de tokens HMAC consumido pelo backend no
// POST /api/v1/onboarding/complete.

const ZERNIO_BASE = "https://zernio.com/api/v1";
const TEMPLATE_NAME = "verify_otp_usage";
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

const CV_COOKIE_NAME = "wd_verified_contacts";
const CV_SECRET = process.env.BETTER_AUTH_SECRET ?? "";
const CV_MAX_AGE_S = 24 * 60 * 60;

type SendResult = { ok: boolean; error?: string; code?: string };

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

function newCode(): string {
  return String(randomInt(100000, 1000000));
}

async function issueCode(
  channel: "whatsapp" | "phone" | "email",
  identifier: string,
  code: string,
): Promise<SendResult> {
  // cooldown — evita spam de SMS/email pago
  const [last] = await db
    .select({ createdAt: otpChallenge.createdAt })
    .from(otpChallenge)
    .where(and(eq(otpChallenge.channel, channel), eq(otpChallenge.identifier, identifier)))
    .orderBy(desc(otpChallenge.createdAt))
    .limit(1);
  if (last) {
    const elapsed = Date.now() - last.createdAt.getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
      const waitS = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, error: `Aguarda ${waitS}s antes de reenviar o código.` };
    }
  }
  // um só código activo por identificador
  await db
    .delete(otpChallenge)
    .where(and(eq(otpChallenge.channel, channel), eq(otpChallenge.identifier, identifier)));
  // housekeeping: limpa desafios expirados de qualquer identificador (best-effort)
  await db.delete(otpChallenge).where(lt(otpChallenge.expiresAt, new Date()));
  await db.insert(otpChallenge).values({
    channel,
    identifier,
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  if (!isProd()) {
    console.log(`[OTP ${channel}] ${code} para ${identifier} (TTL 5m, dev log)`);
  }
  return { ok: true, code };
}

type CheckResult = { ok: true; identifier: string } | { ok: false; error: string };

async function checkCode(
  channel: "whatsapp" | "phone" | "email",
  identifier: string,
  code: string,
): Promise<CheckResult> {
  const [entry] = await db
    .select()
    .from(otpChallenge)
    .where(and(eq(otpChallenge.channel, channel), eq(otpChallenge.identifier, identifier)))
    .orderBy(desc(otpChallenge.createdAt))
    .limit(1);
  if (!entry) return { ok: false, error: "Nenhum código enviado. Reenvia." };
  if (Date.now() > entry.expiresAt.getTime()) {
    await db.delete(otpChallenge).where(eq(otpChallenge.id, entry.id));
    return { ok: false, error: "Código expirado. Reenvia um novo." };
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    await db.delete(otpChallenge).where(eq(otpChallenge.id, entry.id));
    return { ok: false, error: "Muitas tentativas. Reenvia um novo código." };
  }
  if (hashCode(code) !== entry.codeHash) {
    await db.update(otpChallenge).set({ attempts: entry.attempts + 1 }).where(eq(otpChallenge.id, entry.id));
    return { ok: false, error: "Código incorrecto. Tenta novamente." };
  }
  await db.delete(otpChallenge).where(eq(otpChallenge.id, entry.id));
  return { ok: true, identifier };
}

/**
 * Devolve os contactos que já passaram verificação OTP nesta conta (últimas 24h),
 * lendo e validando os tokens HMAC do cookie httpOnly. Usado pelo onboarding
 * para restaurar o estado "verificado" após refresh sem re-enviar código.
 */
export async function getVerifiedContacts(): Promise<
  { channel: "whatsapp" | "phone" | "email"; identifier: string }[]
> {
  const store = await cookies();
  const raw = store.get(CV_COOKIE_NAME)?.value ?? null;
  return parseVerifiedContacts(CV_SECRET, raw).filter((v): v is { channel: "whatsapp" | "phone" | "email"; identifier: string } =>
    v.channel === "whatsapp" || v.channel === "phone" || v.channel === "email",
  );
}

/** Grava token HMAC provando que o contacto passou verificação (cookie httpOnly, 24h). */
async function rememberVerifiedContact(channel: "whatsapp" | "phone" | "email", identifier: string): Promise<void> {  const token = signContactVerification(CV_SECRET, { channel, identifier });
  const store = await cookies();
  const existing = store.get(CV_COOKIE_NAME)?.value ?? "";
  const tokens = existing.split(/[\s,]+/).filter(Boolean).slice(-4); // mantém os últimos 4
  tokens.push(token);
  store.set(CV_COOKIE_NAME, tokens.join(" "), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: CV_MAX_AGE_S,
  });
}

// --- WhatsApp (Zernio) ---

async function sendViaZernio(toDigits: string, code: string): Promise<SendResult> {
  const accountId = process.env.ZERNIO_PHONE_ID;
  const apiKey = process.env.ZERNIO_API_KEY;
  if (!accountId || !apiKey) {
    if (isProd()) {
      return { ok: false, error: "Serviço WhatsApp não configurado — contacta o suporte Workdeal." };
    }
    console.warn("[Zernio] variáveis em falta — mock dev");
    console.log(`[OTP Zernio mock] ${code} para +${toDigits}`);
    return { ok: true };
  }

  try {
    const res = await fetch(`${ZERNIO_BASE}/inbox/conversations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        participantId: toDigits,
        templateName: TEMPLATE_NAME,
        templateLanguage: "pt_PT",
        templateParams: [code],
      }),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (res.ok) {
      console.log(`[Zernio] WhatsApp OTP enviado para +${toDigits}`);
      return { ok: true };
    }
    const error = `${res.status} ${text.slice(0, 500)}`;
    console.warn(`[Zernio] falha → ${error}`);
    if (!isProd()) {
      console.log(`[OTP Zernio mock fallback] ${code} para +${toDigits}`);
      return { ok: true };
    }
    return { ok: false, error: "Falha ao enviar WhatsApp — tenta novamente em instantes." };
  } catch (e) {
    console.warn(`[Zernio] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    if (!isProd()) return { ok: true };
    return { ok: false, error: "Falha ao enviar WhatsApp — tenta novamente em instantes." };
  }
}

export async function sendWhatsappOtp(input: { whatsapp: string }): Promise<SendResult> {
  const digits = normalizeMzPhone(input.whatsapp);
  if (!digits) return { ok: false, error: "Número inválido. Use formato +258 82 000 0000 (moçambicano)." };
  const r = await issueCode("whatsapp", digits, newCode());
  if (!r.ok || !r.code) return r;
  return sendViaZernio(digits, r.code);
}

export async function verifyWhatsappOtp(input: { whatsapp: string; code: string }): Promise<SendResult> {
  const digits = normalizeMzPhone(input.whatsapp);
  const code = input.code?.trim();
  if (!digits || !code || !/^\d{6}$/.test(code)) return { ok: false, error: "Código deve ter 6 dígitos." };
  const r = await checkCode("whatsapp", digits, code);
  if (!r.ok) return { ok: false, error: r.error };
  await rememberVerifiedContact("whatsapp", r.identifier);
  return { ok: true };
}

// --- SMS (Turbo.host) ---

async function sendViaTurboSms(toE164: string, code: string): Promise<SendResult> {
  const urlRaw = process.env.SMS_API_URL || "https://my.turbo.host/api/international-sms/submit";
  const token = process.env.SMS_USER_TOKEN;
  if (!token) {
    if (isProd()) {
      return { ok: false, error: "Serviço SMS não configurado — contacta o suporte Workdeal." };
    }
    console.warn("[SMS] SMS_USER_TOKEN em falta — mock dev");
    return { ok: true };
  }
  let url = urlRaw.replace(/\/+$/, "");
  if (!url.endsWith("/submit")) url = `${url}/submit`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_token: token,
        origin: "CODEBAZ",
        message: `O teu codigo Workdeal e ${code}. Valido por 5 minutos.`,
        numbers: [toE164],
      }),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    interface TurboSmsResponse { status?: string; message?: string }
    const data: TurboSmsResponse | null = text
      ? (JSON.parse(text) as TurboSmsResponse)
      : null;
    if (res.ok && data?.status === "successful") {
      console.log(`[SMS] OTP enviado para ${toE164}`);
      return { ok: true };
    }
    console.warn(`[SMS] falha ${url} → ${res.status} ${(data?.message ?? text).slice(0, 300)}`);
    if (!isProd()) return { ok: true };
    return { ok: false, error: "Falha ao enviar SMS — verifica o número ou usa WhatsApp/email." };
  } catch (e) {
    console.warn(`[SMS] erro fetch ${e instanceof Error ? e.message : String(e)}`);
    if (!isProd()) return { ok: true };
    return { ok: false, error: "Falha ao enviar SMS — verifica o número ou usa WhatsApp/email." };
  }
}

export async function sendPhoneOtp(input: { phone: string }): Promise<SendResult> {
  const digits = normalizeMzPhone(input.phone);
  if (!digits) return { ok: false, error: "Número inválido. Use formato +258 82 000 0000 (moçambicano)." };
  const r = await issueCode("phone", digits, newCode());
  if (!r.ok || !r.code) return r;
  return sendViaTurboSms(`+${digits}`, r.code);
}

export async function verifyPhoneOtp(input: { phone: string; code: string }): Promise<SendResult> {
  const digits = normalizeMzPhone(input.phone);
  const code = input.code?.trim();
  if (!digits || !code || !/^\d{6}$/.test(code)) return { ok: false, error: "Código deve ter 6 dígitos." };
  const r = await checkCode("phone", digits, code);
  if (!r.ok) return { ok: false, error: r.error };
  await rememberVerifiedContact("phone", r.identifier);
  return { ok: true };
}

// --- Email (API interna /api/v1/email/otp) ---

export async function sendEmailOtp(input: { email: string }): Promise<SendResult> {
  const id = contactIdentifier("email", input.email);
  if (!id) return { ok: false, error: "Email inválido." };
  const r = await issueCode("email", id, newCode());
  if (!r.ok || !r.code) return r;
  const code = r.code;

  try {
    // Route through local proxy to avoid Vercel Deployment Protection
    const res = await fetch(`${getWebOrigin()}/api/v1/email/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.INTERNAL_API_SECRET ? { "x-internal-secret": process.env.INTERNAL_API_SECRET } : {}),
      },
      body: JSON.stringify({ to: id, code }),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    interface EmailOtpResponse { success?: boolean; error?: { message?: string } }
    const data: EmailOtpResponse | null = text
      ? (JSON.parse(text) as EmailOtpResponse)
      : null;
    if (res.ok && data?.success !== false) {
      console.log(`[Email] OTP enviado para ${id}`);
      return { ok: true };
    }
    const apiMessage = data?.error?.message ?? text.slice(0, 200) ?? `${res.status}`;
    if (!isProd() && !res.ok) {
      // dev: não bloquear onboarding local se API offline
      return { ok: true };
    }
    return { ok: false, error: `Falha ao enviar email: ${String(apiMessage).slice(0, 150)}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Email] erro fetch → ${msg}`);
    if (!isProd()) return { ok: true };
    return { ok: false, error: "Falha ao enviar email — tenta novamente ou usa WhatsApp/SMS." };
  }
}

export async function verifyEmailOtp(input: { email: string; code: string }): Promise<SendResult> {
  const id = contactIdentifier("email", input.email);
  const code = input.code?.trim();
  if (!id || !code || !/^\d{6}$/.test(code)) return { ok: false, error: "Código deve ter 6 dígitos." };
  const r = await checkCode("email", id, code);
  if (!r.ok) return { ok: false, error: r.error };
  await rememberVerifiedContact("email", r.identifier);
  return { ok: true };
}
