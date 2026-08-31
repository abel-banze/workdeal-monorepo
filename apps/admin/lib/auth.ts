import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionInfo, SystemRole } from "@workdeal/shared";
import { env } from "@/lib/env";

const AUTH_URL = env.BETTER_AUTH_URL.replace(/\/+$/, "");

// Valida a sessão DELEGANDO ao backend (better-auth na BD remota que tem as tabelas de sessão),
// em vez de consultar a BD local das apps (que não tem a tabela "session" -> relation does not exist).
// É server-side (Server Component / Server Action), não é o browser a chamar o backend directamente.
export const getServerSession = cache(async (): Promise<SessionInfo | null> => {
  try {
    const store = await cookies();
    const cookieHeader = store.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    if (!cookieHeader) return null;

    const timeout = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
    const sessionPromise = fetch(`${AUTH_URL}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data as { user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string }; session?: { id?: string } } | null)
      .catch(() => null);

    const response = (await Promise.race([sessionPromise, timeout(2000)])) as { user?: { id?: string; email?: string; name?: string; image?: string | null; systemRole?: string; emailVerified?: boolean; phone?: string | null; locale?: string }; session?: { id?: string } } | null;

    if (!response?.user?.id) return null;

    return {
      sessionId: response.session?.id ?? null,
      user: {
        id: response.user.id,
        email: response.user.email ?? "",
        name: response.user.name ?? "",
        image: (response.user as { image?: string | null }).image ?? null,
        systemRole: response.user.systemRole === "moderator" || response.user.systemRole === "admin" ? response.user.systemRole : "user",
        emailVerified: response.user.emailVerified === true,
        phone: (response.user as { phone?: string | null }).phone ?? null,
        locale: (response.user as { locale?: string }).locale ?? "pt-MZ",
      },
    };
  } catch {
    return null;
  }
});

export async function requireAuth(): Promise<SessionInfo> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * RBAC — exige que o utilizador seja da equipa Workdeal com um dos papéis de sistema indicados.
 * Papéis permitidos no painel admin: moderator e admin.
 * Admin bypassa qualquer restrição (system:manage).
 */
export async function requireSystemRole(...roles: Array<"admin" | "moderator">): Promise<SessionInfo> {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  const role = session.user.systemRole as SystemRole;
  const allowed = roles as string[];
  const isAdmin = role === "admin";
  if (!isAdmin && !allowed.includes(role)) {
    redirect("/forbidden");
  }
  return session;
}
