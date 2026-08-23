import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { createQuoteSchema, listQuotesQuerySchema, updateQuoteStatusSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware";
import type { Env } from "../middlewares/auth.middleware";
import { optionalAuth, getUserOrNull } from "../middlewares/optional-auth.middleware";
import { quotesController } from "../controllers/quotes.controller";
import { AppError } from "../lib/errors";

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente dentro de minutos.");
    await next();
  };
}

export const quotesRoute = new Hono<Env>();

// Cotações aceitam convidados — auth opcional; utilizadores logados ficam
// associados via requester_user_id, convidados ficam só com contactos
quotesRoute.post("/", rateLimit(createLimiter), optionalAuth, zValidator("json", createQuoteSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await quotesController.create(getUserOrNull(c), body);
  return c.json(resBody, status);
});

quotesRoute.get("/", requireAuth, zValidator("query", listQuotesQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await quotesController.list(c.get("user"), { role: q.role as never, status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

quotesRoute.get("/:id", requireAuth, async (c) => {
  const { body, status } = await quotesController.get(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});

quotesRoute.patch("/:id/status", requireAuth, zValidator("json", updateQuoteStatusSchema), async (c) => {
  const { status } = c.req.valid("json");
  const { body, status: httpStatus } = await quotesController.updateStatus(c.get("user"), c.req.param("id"), status);
  return c.json(body, httpStatus);
});
