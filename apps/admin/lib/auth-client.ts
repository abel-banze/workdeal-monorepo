import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [jwtClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;

/**
 * Obtain the JWT server-side and store it as the httpOnly `workdeal_jwt` cookie,
 * via a single Server Action.
 */
export async function fetchJwtToken(): Promise<void> {
  const { syncSessionJwt } = await import("@/app/actions/auth");
  const result = await syncSessionJwt();
  if (!result.ok) throw new Error(result.error ?? "Falha ao sincronizar JWT");
}
