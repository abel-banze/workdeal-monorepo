import { createAuthClient } from "better-auth/react"
import { jwtClient, organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), jwtClient()],
})

/**
 * Fetch the JWT from /api/auth/token via the proxy (browser → proxy → API),
 * then store it as httpOnly `workdeal_jwt` cookie via the syncJwt server action.
 *
 * The better-auth signIn/signUp response returns the session token in res.data.token,
 * NOT the JWT. The JWT must be fetched separately from /api/auth/token.
 */
export async function fetchJwtToken(): Promise<void> {
  const res = await fetch("/api/auth/token", { cache: "no-store", credentials: "include" })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Falha ao obter JWT: ${res.status} ${txt.slice(0, 200)}`)
  }
  const data = await res.json().catch(() => ({})) as { token?: string }
  console.log("[fetchJwtToken] /api/auth/token returned token:", !!data.token)
  if (!data.token || typeof data.token !== "string") {
    throw new Error("Token vazio no /api/auth/token")
  }
  const { syncJwt } = await import("@/app/actions/auth")
  const result = await syncJwt(data.token)
  console.log("[fetchJwtToken] syncJwt result:", result)
  if (!result.ok) throw new Error(result.error ?? "Falha ao sincronizar JWT")
}
