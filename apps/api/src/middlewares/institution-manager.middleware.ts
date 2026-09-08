import { createMiddleware } from "hono/factory";
import { AppError } from "../lib/errors.js";
import { institutionsRepository } from "../repositories/institutions.repository.js";
import type { Env } from "./auth.middleware.js";

// Exige que o utilizador seja gestor da instituição (qualquer papel).
// Espera a instituição em c.req.param("institutionId"). Admins/moderadores
// passam sempre (a autorização fina é validada no service por permissão).
export const requireInstitutionManager = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");

  if (user.systemRole === "admin" || user.systemRole === "moderator") {
    await next();
    return;
  }

  const institutionId = c.req.param("institutionId");
  if (!institutionId) {
    throw new AppError(500, "MISSING_PARAM", "institutionId em falta na rota");
  }

  const manager = await institutionsRepository.findManager(institutionId, user.id);
  if (!manager) {
    throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir esta instituição");
  }

  await next();
});
