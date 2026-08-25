import { createMiddleware } from "hono/factory";
import { JWT_COOKIE_NAME, parseCookies, verifyJwt } from "@workdeal/auth";
import type { AuthUser } from "@workdeal/shared";
import type { Env } from "./auth.middleware.js";

/**
 * Auth opcional: define `user` se houver sessão válida, caso contrário
 * continua sem lançar erro — para rotas que aceitam convidados (ex: cotações).
 */
export const optionalAuth = createMiddleware<Env>(async (c, next) => {
  const header = c.req.header("Authorization");
  let token: string | undefined;
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  }
  if (!token) {
    token = parseCookies(c.req.header("Cookie"))[JWT_COOKIE_NAME];
  }
  if (!token) {
    await next();
    return;
  }

  const session = await verifyJwt(token);
  if (session && !(session.user as unknown as { deletedAt?: string | null })?.deletedAt) {
    c.set("user", session.user);
  }
  await next();
});

export type OptionalUser = AuthUser | null;

export function getUserOrNull(c: { get: (key: "user") => AuthUser | undefined }): OptionalUser {
  return c.get("user") ?? null;
}
