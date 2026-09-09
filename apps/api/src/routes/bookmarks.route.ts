import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { bookmarksRepository } from "../repositories/bookmarks.repository.js";
import { ok } from "../lib/api-response.js";
import { AppError } from "../lib/errors.js";

export const bookmarksRoute = new Hono<Env>();

const scopeQuerySchema = z.object({
  organizationId: z.string().min(1).max(128).nullish(),
});

const scopeBodySchema = z.object({
  organizationId: z.string().min(1).max(128).nullish(),
});

// Dono do âmbito: pessoal (sem organizationId) ou empresa (membro).
// Devolve o organizationId normalizado (string) ou null (pessoal).
async function resolveScope(userId: string, organizationId: string | null | undefined): Promise<string | null> {
  if (organizationId == null) return null;
  const isMember = await bookmarksRepository.isMemberOf(userId, organizationId);
  if (!isMember) throw new AppError(403, "FORBIDDEN", "Não pertence a esta organização");
  return organizationId;
}

bookmarksRoute.get("/me", requireAuth, zValidator("query", scopeQuerySchema), async (c) => {
  const userId = c.get("user").id;
  const organizationId = await resolveScope(userId, c.req.valid("query").organizationId ?? null);
  const rows =
    organizationId != null
      ? await bookmarksRepository.listByOwner({ kind: "organization", userId, organizationId })
      : await bookmarksRepository.listByOwner({ kind: "personal", userId });
  return c.json(ok(rows), 200);
});

bookmarksRoute.get("/:profileId/status", requireAuth, zValidator("query", scopeQuerySchema), async (c) => {
  const userId = c.get("user").id;
  const organizationId = await resolveScope(userId, c.req.valid("query").organizationId ?? null);
  const bookmarked = await bookmarksRepository.isBookmarked(userId, c.req.param("profileId"), organizationId);
  return c.json(ok({ bookmarked }), 200);
});

async function readScopeBody(c: Context<Env>): Promise<string | null | undefined> {
  // Corpo opcional (compat: clientes antigos chamam sem body = âmbito pessoal)
  const raw: unknown = await c.req.json().catch(() => ({}));
  const parsed = scopeBodySchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data.organizationId : undefined;
}

bookmarksRoute.post("/:profileId/toggle", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const organizationId = await resolveScope(userId, (await readScopeBody(c)) ?? null);
  const bookmarked = await bookmarksRepository.toggle(userId, c.req.param("profileId"), organizationId);
  return c.json(ok({ bookmarked }), 200);
});

bookmarksRoute.post("/:profileId", requireAuth, async (c) => {
  const userId = c.get("user").id;
  const organizationId = await resolveScope(userId, (await readScopeBody(c)) ?? null);
  await bookmarksRepository.bookmark(userId, c.req.param("profileId"), organizationId);
  return c.json(ok(null), 201);
});

bookmarksRoute.delete("/:profileId", requireAuth, zValidator("query", scopeQuerySchema), async (c) => {
  const userId = c.get("user").id;
  const organizationId = await resolveScope(userId, c.req.valid("query").organizationId ?? null);
  await bookmarksRepository.unbookmark(userId, c.req.param("profileId"), organizationId);
  return c.json(ok(null), 200);
});
