import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import {
  bidListQuerySchema,
  createBidSchema,
  createProposalSchema,
  createTaskSchema,
  proposalListQuerySchema,
  taskListQuerySchema,
  updateBidStatusSchema,
  updateProposalStatusSchema,
  updateTaskSchema,
} from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { tasksController } from "../controllers/tasks.controller.js";
import { AppError } from "../lib/errors.js";

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

function rateLimit(limiter: ReturnType<typeof createRateLimiter>) {
  return async (c: Parameters<Parameters<Hono<Env>["use"]>[1]>[0], next: () => Promise<void>) => {
    const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
    const r = limiter.check(key);
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições. Tente dentro de minutos.");
    await next();
  };
}

export const tasksRoute = new Hono<Env>();

// ── Listagens (estáticas antes de /:id) ───────────────────────────
tasksRoute.get("/", zValidator("query", taskListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tasksController.list({
    status: q.status,
    categoryId: q.categoryId,
    province: q.province,
    page: q.page,
    limit: q.limit,
  });
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

tasksRoute.get("/my", requireAuth, zValidator("query", taskListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tasksController.my(c.get("user"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

tasksRoute.get("/proposals", requireAuth, zValidator("query", proposalListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tasksController.myProposals(c.get("user"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

tasksRoute.get("/bids", requireAuth, zValidator("query", bidListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tasksController.listBids(c.get("user"), { role: q.role, status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

tasksRoute.get("/bids/:id", requireAuth, async (c) => {
  const { body, status } = await tasksController.getBid(c.get("user"), c.req.param("id"));
  return c.json(body, status);
});

tasksRoute.patch("/bids/:id", requireAuth, zValidator("json", updateBidStatusSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.patchBid(c.get("user"), c.req.param("id"), body);
  return c.json(resBody, status);
});

// ── Tarefa individual ─────────────────────────────────────────────
tasksRoute.get("/:id", async (c) => {
  const { body, status } = await tasksController.get(c.req.param("id"));
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
});

tasksRoute.patch("/:id", requireAuth, zValidator("json", updateTaskSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.patch(c.get("user"), c.req.param("id"), body);
  return c.json(resBody, status);
});

// ── Propostas por tarefa ──────────────────────────────────────────
tasksRoute.get("/:taskId/proposals", requireAuth, zValidator("query", proposalListQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { body, status } = await tasksController.listProposals(c.get("user"), c.req.param("taskId"), { status: q.status, page: q.page, limit: q.limit });
  return c.json(body, status);
});

tasksRoute.post("/:taskId/proposals", requireAuth, rateLimit(createLimiter), zValidator("json", createProposalSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.submitProposal(c.get("user"), body);
  return c.json(resBody, status);
});

tasksRoute.patch("/:taskId/proposals/:proposalId", requireAuth, zValidator("json", updateProposalStatusSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.updateProposalStatus(c.get("user"), c.req.param("taskId"), c.req.param("proposalId"), body);
  return c.json(resBody, status);
});

tasksRoute.post("/:taskId/proposals/:proposalId/bid", requireAuth, rateLimit(createLimiter), zValidator("json", createBidSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.acceptProposal(c.get("user"), c.req.param("taskId"), c.req.param("proposalId"), body);
  return c.json(resBody, status);
});

// ── Criação de tarefa ─────────────────────────────────────────────
tasksRoute.post("/", requireAuth, rateLimit(createLimiter), zValidator("json", createTaskSchema), async (c) => {
  const body = c.req.valid("json");
  const { body: resBody, status } = await tasksController.create(c.get("user"), body);
  return c.json(resBody, status);
});