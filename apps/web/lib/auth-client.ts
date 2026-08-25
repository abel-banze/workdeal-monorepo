import { createAuthClient } from "better-auth/react"
import { jwtClient, organizationClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [organizationClient(), jwtClient()],
})

// Delega para Server Action httpOnly (mais seguro).
// O JWT é gravado como cookie httpOnly `workdeal_jwt` via `syncJwt()`.
// `sessionToken` é opcional — quando fornecido (via client response), bypassa a leitura
// de cookie que pode falhar se o proxy não encaminhar Set-Cookie correctamente.
export async function fetchJwtToken(sessionToken?: string): Promise<void> {
  console.log("[fetchJwtToken] sessionToken provided:", !!sessionToken, "preview:", sessionToken ? sessionToken.slice(0, 20) + "..." : "none")
  const { syncJwt } = await import("@/app/actions/auth")
  const res = await syncJwt(sessionToken)
  console.log("[fetchJwtToken] syncJwt result:", res)
  if (!res.ok) throw new Error(res.error ?? "Falha ao sincronizar JWT")
}
