import { createAuthClient } from "better-auth/react"
import { jwtClient, organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), jwtClient()],
})

// Mantido por compatibilidade — delega para Server Action httpOnly (mais seguro).
// O JWT é gravado como cookie httpOnly `workdeal_jwt` via `syncJwt()`; o antigo
// `fetch("/api/auth/token")` só devolvia JSON e nunca gravava o cookie.
export async function fetchJwtToken(): Promise<void> {
  const { syncJwt } = await import("@/app/actions/auth")
  const res = await syncJwt()
  if (!res.ok) throw new Error(res.error ?? "Falha ao sincronizar JWT")
}
