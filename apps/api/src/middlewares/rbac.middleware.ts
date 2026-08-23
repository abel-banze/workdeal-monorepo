import { createMiddleware } from "hono/factory";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, hasSystemPermission } from "@workdeal/shared";
import type { DomainPermission } from "@workdeal/shared";
import { AppError } from "../lib/errors";
import type { Env } from "./auth.middleware";

export const requireOrgPermission =
  (permission: DomainPermission) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");

    if (hasSystemPermission(user.systemRole, permission)) {
      await next();
      return;
    }

    const organizationId = c.req.param("organizationId");
    if (!organizationId) {
      throw new AppError(500, "MISSING_PARAM", "organizationId em falta na rota");
    }

    const role = await getOrgRole(user.id, organizationId);
    if (!role || !hasOrgPermission(role, permission)) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para esta acção");
    }

    await next();
  });

export const requireSystemRole =
  (...roles: Array<"admin" | "moderator">) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.systemRole as "admin" | "moderator")) {
      throw new AppError(403, "FORBIDDEN", "Acesso restrito à equipa Workdeal");
    }
    await next();
  });

export const requireOwnership = createMiddleware<Env>(async (c, next) => {
  const user = c.get("user");
  const userId = c.req.param("userId");
  if (!userId) {
    throw new AppError(500, "MISSING_PARAM", "userId em falta na rota");
  }
  if (user.id !== userId) {
    throw new AppError(403, "FORBIDDEN", "Só o dono do recurso pode executar esta acção");
  }
  await next();
});
