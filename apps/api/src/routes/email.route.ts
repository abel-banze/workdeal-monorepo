import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sendContactEmail, sendOtpEmail } from "../services/email.service.js";
import { ok, fail } from "../lib/api-response.js";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";

// NOTA: verificação de INTERNAL_API_SECRET removida por agora — endpoints de
// email acessíveis por quem chamar a API. Retomar assim que houver segredo
// partilhado configurado entre web e api.
const emailLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });
const contactLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const sendOtpSchema = z.object({
  to: z.string().email("Email inválido"),
  code: z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos"),
  brandName: z.string().max(64).optional(),
});

export const emailRoute = new Hono();

emailRoute.post("/otp", async (c, next) => {
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

emailRoute.post("/contact", async (c, next) => {
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
