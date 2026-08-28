import { Hono } from "hono";
import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { uploadFileSchema } from "@workdeal/shared";
import { requireAuth } from "../middlewares/auth.middleware.js";
import type { Env } from "../middlewares/auth.middleware.js";
import { optionalAuth } from "../middlewares/optional-auth.middleware.js";
import { filesController } from "../controllers/files.controller.js";
import { AppError } from "../lib/errors.js";

const uploadLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const anonUploadLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export const filesRoute = new Hono<Env>();

// Upload aceita convidados, mas anónimos só podem anexar a cotações
// (purpose=quote) e com rate limit mais apertado
filesRoute.post("/upload", optionalAuth, async (c) => {
  const user = c.get("user");
  const key = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon";
  const limiter = user ? uploadLimiter : anonUploadLimiter;
  const r = limiter.check(key);
  if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas requisições.");

  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || !(file instanceof File)) {
    throw new AppError(400, "FILE_REQUIRED", "Campo 'file' é obrigatório (multipart/form-data)");
  }
  const parsed = uploadFileSchema.safeParse({ purpose: body["purpose"] ?? undefined });
  if (!parsed.success) {
    throw new AppError(400, "INVALID_PURPOSE", "Campo 'purpose' inválido (quote | avatar | logo | verification | generic)");
  }
  if (!user && parsed.data.purpose !== "quote") {
    throw new AppError(401, "UNAUTHORIZED", "Inicie sessão para carregar ficheiros fora de cotações");
  }
  const { body: resBody, status } = await filesController.upload(user?.id ?? null, file, parsed.data.purpose);
  return c.json(resBody, status);
});

filesRoute.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const { body, status } = await filesController.get(c.get("user"), id);
  return c.json(body, status);
});

filesRoute.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const { body, status } = await filesController.remove(c.get("user"), id);
  return c.json(body, status);
});
