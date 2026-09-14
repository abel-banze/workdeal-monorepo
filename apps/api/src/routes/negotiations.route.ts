import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import {
  createThreadSchema,
  negotiationListMessagesQuerySchema,
  negotiationListThreadsQuerySchema,
  sendNegotiationMessageSchema,
} from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { negotiationsController } from "../controllers/negotiations.controller.js";
import { AppError } from "../lib/errors.js";

const sendLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente dentro de minutos.");
    await next();
  };
}

export const negotiationsRoute = new Hono<Env>();

negotiationsRoute.get("/", requireAuth, zValidator("query", negotiationListThreadsQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await negotiationsController.list(c.get("user"), {
    role: q.role,
    status: q.status,
    page: q.page,
    limit: q.limit,
  });
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

negotiationsRoute.post("/open", requireAuth, rateLimit(sendLimiter), zValidator("json", createThreadSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await negotiationsController.open(c.get("user"), body);
  return c.json(resBody, status);
});

negotiationsRoute.get("/:threadId", requireAuth, async (c) => {
  const { body, status } = await negotiationsController.get(c.get("user"), c.req.param("threadId"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

negotiationsRoute.get("/:threadId/messages", requireAuth, zValidator("query", negotiationListMessagesQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await negotiationsController.listMessages(c.get("user"), c.req.param("threadId"), { page: q.page, limit: q.limit });
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

negotiationsRoute.post("/:threadId/messages", requireAuth, rateLimit(sendLimiter), zValidator("json", sendNegotiationMessageSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await negotiationsController.send(c.get("user"), c.req.param("threadId"), body);
  return c.json(resBody, status);
});