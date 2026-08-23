import { NextRequest, NextResponse } from "next/server"
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies"

const PROTECTED_PREFIX = "/dashboard"
const ONBOARDING_PATH = "/onboarding"

export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith(PROTECTED_PREFIX) && !req.cookies.has(JWT_COOKIE_NAME)) {
    const login = new URL("/login", req.url)
    login.searchParams.set("next", req.nextUrl.pathname)
    return NextResponse.redirect(login)
  }
  // Onboarding também é protegido — sem JWT não entra
  if (req.nextUrl.pathname.startsWith(ONBOARDING_PATH) && !req.cookies.has(JWT_COOKIE_NAME)) {
    const login = new URL("/login", req.url)
    login.searchParams.set("next", ONBOARDING_PATH)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
}
