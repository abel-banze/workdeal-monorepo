import { NextRequest, NextResponse } from "next/server"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"

const PROTECTED_PREFIX = "/dashboard"

// Rede de segurança leve (edge-compatible) — o RBAC real acontece no layout
// via requireSystemRole. Este proxy só redireciona não-autenticados a tempo,
// poupando o render do dashboard quando não há sequer sessão.
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith(PROTECTED_PREFIX) && !req.cookies.has(JWT_COOKIE_NAME)) {
    const login = new URL("/login", req.url)
    login.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
