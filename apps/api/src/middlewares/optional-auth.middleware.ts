import { createMiddleware } from "hono/factory";
import { auth, JWT_COOKIE_NAME, parseCookies, verifyJwt } from "@workdeal/auth";
import type { AuthUser } from "@workdeal/shared";
import type { Env } from "./auth.middleware.js";

const BETTER_AUTH_SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"] as const;

/**
 * Auth opcional: define `user` se houver sessão válida, caso contrário
 * continua sem lançar erro — para rotas que aceitam convidados (ex: cotações).
 */
export const optionalAuth = createMiddleware<Env>(async (c, next) => {
  // 1. Tentar JWT
  const header = c.req.header("Authorization");
  let token: string | undefined;
  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length).trim();
  }
  if (!token) {
    token = parseCookies(c.req.header("Cookie"))[JWT_COOKIE_NAME];
  }
  if (token) {
    const session = await verifyJwt(token);
    if (session && !(session.user as unknown as { deletedAt?: string | null })?.deletedAt) {
      c.set("user", session.user);
      await next();
      return;
    }
  }

  // 2. Fallback: sessão better-auth
  const rawCookieHeader = c.req.header("Cookie");
  const allCookies = parseCookies(rawCookieHeader);
  const hasSessionCookie = BETTER_AUTH_SESSION_COOKIES.some((name) => Boolean(allCookies[name]));
  if (hasSessionCookie) {
    try {
      const session = await auth.api.getSession({
        headers: new Headers({ Cookie: rawCookieHeader ?? "" }),
      });
      if (session?.user) {
        const u = session.user as unknown as { deletedAt?: Date | null; id: string; email: string; name: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string };
        if (!u.deletedAt) {
          c.set("user", {
            id: u.id,
            email: u.email,
            name: u.name,
            image: u.image ?? null,
            systemRole: (u.systemRole === "moderator" || u.systemRole === "admin" ? u.systemRole : "user") as AuthUser["systemRole"],
            emailVerified: u.emailVerified === true,
            phone: u.phone ?? null,
            locale: u.locale ?? "pt-MZ",
          });
        }
      }
    } catch {
      // sessão inválida — continua sem user
    }
  }

  await next();
});

export type OptionalUser = AuthUser | null;

export function getUserOrNull(c: { get: (key: "user") => AuthUser | undefined }): OptionalUser {
  return c.get("user") ?? null;
}
