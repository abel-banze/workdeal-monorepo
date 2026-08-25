import { createAuthClient } from "better-auth/react"
import { jwtClient, organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), jwtClient()],
})

/**
 * Fetch the JWT from /api/auth/token via the proxy (browser → proxy → API),
 * then store it as httpOnly `workdeal_jwt` cookie via the syncJwt server action.
 */
export async function fetchJwtToken(): Promise<void> {
  const res = await fetch("/api/auth/token", { cache: "no-store", credentials: "include" })
  if (!res.ok) {
    throw new Error(`Falha ao obter JWT: ${res.status}`)
  }
  const data = await res.json().catch(() => ({})) as { token?: string }
  if (!data.token || typeof data.token !== "string") {
    throw new Error("Token vazio no /api/auth/token")
  }
  const { syncJwt } = await import("@/app/actions/auth")
  const result = await syncJwt(data.token)
  if (!result.ok) throw new Error(result.error ?? "Falha ao sincronizar JWT")
}
