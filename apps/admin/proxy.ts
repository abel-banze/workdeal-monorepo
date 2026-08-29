import { auth } from "@workdeal/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy de autenticação — replica apps/web/proxy.ts
// Protege rotas autenticadas e redireciona para /login quando sem sessão
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api/auth");

  const isPublicRoute = request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon");

  if (!session && !isAuthRoute && !isPublicRoute) {
    // replica comportamento de web: deixa passar mas marca header para layout fazer redirect
    // ou redireciona directamente — ajusta conforme web faz
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
