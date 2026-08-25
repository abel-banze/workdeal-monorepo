import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthUser, SessionInfo } from "@workdeal/shared";

const BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:4000";

// On the API server, BETTER_AUTH_URL points to itself — JWKS is local.
// On the web server, this module is no longer used (getServerSession uses the proxy).
const JWKS_URL = new URL(`${BETTER_AUTH_URL}/api/auth/jwks`);
const JWKS = createRemoteJWKSet(JWKS_URL, {
  cacheMaxAge: 60 * 60 * 1000,
});

interface JwtClaims extends JWTPayload {
  sub?: string;
  sessionId?: string;
  email?: string;
  name?: string;
  image?: string | null;
  systemRole?: string;
  emailVerified?: boolean;
  phone?: string | null;
  locale?: string;
}

export async function verifyJwt(token: string): Promise<SessionInfo | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: BETTER_AUTH_URL,
      audience: BETTER_AUTH_URL,
    });
    return claimsToSessionInfo(payload as JwtClaims);
  } catch {
    return null;
  }
}

function claimsToSessionInfo(claims: JwtClaims): SessionInfo | null {
  if (!claims.sub) return null;
  const user: AuthUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    name: typeof claims.name === "string" ? claims.name : "",
    image: typeof claims.image === "string" ? claims.image : null,
    systemRole: claims.systemRole === "moderator" || claims.systemRole === "admin" ? claims.systemRole : "user",
    emailVerified: claims.emailVerified === true,
    phone: typeof claims.phone === "string" ? claims.phone : null,
    locale: typeof claims.locale === "string" ? claims.locale : "pt-MZ",
  };
  return {
    sessionId: typeof claims.sessionId === "string" ? claims.sessionId : null,
    user,
  };
}
