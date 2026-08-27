import { createMiddleware } from "hono/factory";
import { auth, JWT_COOKIE_NAME, parseCookies, verifyJwt } from "@workdeal/auth";
import type { AuthUser } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";

export type Env = {
  Variables: {
    user: AuthUser;
    sessionId: string | null;
  };
};

const BETTER_AUTH_SESSION_COOKIES = ["__Secure-better-auth.session_token", "better-auth.session_token"] as const;

export const requireAuth = createMiddleware<Env>(async (c, next) => {
  // 1. Tentar JWT (Authorization header ou cookie workdeal_jwt)
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
    if (session) {
      if ((session.user as unknown as { deletedAt?: string | null })?.deletedAt) {
        throw new AppError(401, "UNAUTHORIZED", "Conta desactivada");
      }
      c.set("user", session.user);
      c.set("sessionId", session.sessionId);
      await next();
      return;
    }
  }

  // 2. Fallback: sessão better-auth (cookie de sessão)
  const allCookies = parseCookies(c.req.header("Cookie"));
  let sessionCookie: string | undefined;
  for (const name of BETTER_AUTH_SESSION_COOKIES) {
    if (allCookies[name]) {
      sessionCookie = allCookies[name];
      break;
    }
  }
  if (sessionCookie) {
    try {
      const session = await auth.api.getSession({
        headers: new Headers({ Cookie: `better-auth.session_token=${sessionCookie}` }),
      });
      if (session?.user) {
        const u = session.user as unknown as { deletedAt?: Date | null; id: string; email: string; name: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string };
        if (u.deletedAt) {
          throw new AppError(401, "UNAUTHORIZED", "Conta desactivada");
        }
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
        c.set("sessionId", session.session?.id ?? null);
        await next();
        return;
      }
    } catch {
      // sessão inválida ou expirada — cai para 401 abaixo
    }
  }

  throw new AppError(401, "UNAUTHORIZED", "Autenticação em falta");
});
