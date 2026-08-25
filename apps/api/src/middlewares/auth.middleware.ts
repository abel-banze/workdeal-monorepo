import { createMiddleware } from "hono/factory";
import { JWT_COOKIE_NAME, parseCookies, verifyJwt } from "@workdeal/auth";
import type { AuthUser } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";

export type Env = {
  Variables: {
    user: AuthUser;
    sessionId: string | null;
  };
};

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header("Authorization");
  let token: string | undefined;
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  }
  if (!token) {
    token = parseCookies(c.req.header("Cookie"))[JWT_COOKIE_NAME];
  }
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Autenticação em falta");
  }

  const session = await verifyJwt(token);
  if (!session) {
    throw new AppError(401, "UNAUTHORIZED", "Sessão inválida ou expirada");
  }
  // Defesa: sessão com utilizador apagado (soft delete) não deve autorizar
  if ((session.user as unknown as { deletedAt?: string | null })?.deletedAt) {
    throw new AppError(401, "UNAUTHORIZED", "Conta desactivada");
  }

  c.set("user", session.user);
  c.set("sessionId", session.sessionId);
  await next();
});
