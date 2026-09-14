import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { assistantChatSchema, proposalDraftSchema, responseDraftSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { agentsController } from "../controllers/agents.controller.js";
import { AppError } from "../lib/errors.js";

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente dentro de minutos.");
    await next();
  };
}

export const agentsRoute = new Hono<Env>();

// ── Assistente comercial ─────────────────────────────────────────────
agentsRoute.post("/assistant/chat", requireAuth, rateLimit(createLimiter), zValidator("json", assistantChatSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await agentsController.chatAssistant(c.get("user"), body);
  return c.json(resBody, status);
});

// ── Rascunho de proposta ─────────────────────────────────────────────
agentsRoute.post("/proposals/draft", requireAuth, rateLimit(createLimiter), zValidator("json", proposalDraftSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await agentsController.draftProposal(c.get("user"), body);
  return c.json(resBody, status);
});

// ── Rascunho de resposta ─────────────────────────────────────────────
agentsRoute.post("/responses/draft", requireAuth, rateLimit(createLimiter), zValidator("json", responseDraftSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await agentsController.draftResponse(c.get("user"), body);
  return c.json(resBody, status);
});