import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sendContactEmail, sendOtpEmail } from "../services/email.service";
import { ok, fail } from "../lib/api-response";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { env } from "../env";

const emailLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// Estes endpoints só são chamados pelo servidor Next (Server Actions) — exigem
// segredo partilhado. Sem segredo configurado: falha em produção, permitido em
// dev com aviso.
let warnedNoSecret = false;
async function requireInternalSecret(c: Context, next: () => Promise<void>) {
  const expected = env.INTERNAL_API_SECRET;
  if (!expected) {
    if (env.NODE_ENV === "production") {
      return c.json(
        fail("INTERNAL_AUTH_REQUIRED", "INTERNAL_API_SECRET não configurado no servidor"),
        503,
      );
    }
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn("[email] INTERNAL_API_SECRET não configurado — endpoint aberto apenas em desenvolvimento");
    }
    await next();
    return;
  }
  const provided = c.req.header("x-internal-secret");
  if (!provided || provided !== expected) {
    return c.json(fail("FORBIDDEN", "Pedido interno inválido"), 403);
  }
  await next();
}

const sendOtpSchema = z.object({
  to: z.string().email("Email inválido"),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
  brandName: z.string().max(64).optional(),
});

export const emailRoute = new Hono();

emailRoute.post("/otp", requireInternalSecret, async (c, next) => {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anonymous";
  const result = await emailLimiter.check(key);
  if (!result.allowed) {
    return c.json(fail("RATE_LIMITED", "Demasiados pedidos. Tenta novamente mais tarde."), 429);
  }
  c.header("X-RateLimit-Remaining", String(result.remaining));
  await next();
}, zValidator("json", sendOtpSchema), async (c) => {
  const { to, code, brandName } = c.req.valid("json");

  const result = await sendOtpEmail({ to, code, brandName });

  if (!result.ok) {
    return c.json(fail("EMAIL_SEND_FAILED", result.error ?? "Falha ao enviar email"), 502);
  }

  return c.json(ok({ sent: true }), 200);
});

const contactSchema = z.object({
  to: z.string().email("Email inválido"),
  fromName: z.string().trim().min(2, "Nome inválido").max(80),
  fromEmail: z.string().email("Email inválido"),
  message: z.string().trim().min(10, "Mensagem curta").max(2000),
  profileName: z.string().max(120).optional(),
});

emailRoute.post("/contact", requireInternalSecret, async (c, next) => {
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anonymous";
  const result = await contactLimiter.check(key);
  if (!result.allowed) {
    return c.json(fail("RATE_LIMITED", "Demasiados pedidos. Tenta novamente mais tarde."), 429);
  }
  c.header("X-RateLimit-Remaining", String(result.remaining));
  await next();
}, zValidator("json", contactSchema), async (c) => {
  const { to, fromName, fromEmail, message, profileName } = c.req.valid("json");
  const result = await sendContactEmail({ to, fromName, fromEmail, message, profileName });
  if (!result.ok) {
    return c.json(fail("EMAIL_SEND_FAILED", result.error ?? "Falha ao enviar email"), 502);
  }
  return c.json(ok({ sent: true }), 200);
});
