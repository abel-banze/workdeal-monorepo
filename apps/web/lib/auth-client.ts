import { createAuthClient } from "better-auth/react"
import { jwtClient, organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), jwtClient()],
})

/**
 * Obtain the JWT server-side and store it as the httpOnly `workdeal_jwt` cookie.
 * A single Server Action does the whole exchange (backend fetch + cookie store),
 * avoiding the extra browser → proxy → API roundtrip of the previous flow.
 */
export async function fetchJwtToken(): Promise<void> {
  const { syncSessionJwt } = await import("@/app/actions/auth")
  const result = await syncSessionJwt()
  if (!result.ok) throw new Error(result.error ?? "Falha ao sincronizar JWT")
}
