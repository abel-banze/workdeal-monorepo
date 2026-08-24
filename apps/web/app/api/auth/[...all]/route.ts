import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

async function proxy(req: NextRequest, ctx: { params: Promise<{ all: string[] }> }) {
  const { all } = await ctx.params
  const base = env.BETTER_AUTH_URL?.replace(/\/+$/, "") ?? "http://localhost:4000"
  const target = new URL(`${base}/api/auth/${all.join("/")}`)
  console.log(`[auth proxy] ${req.method} ${req.nextUrl.pathname}${req.nextUrl.search} -> ${target.href} env=${process.env.VERCEL_ENV ?? process.env.NODE_ENV} baseHost=${(() => { try { return new URL(base).host; } catch { return base; } })()}`)
  target.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.set("host", target.host)
  headers.set("x-forwarded-host", req.headers.get("host") ?? "")
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""))
  headers.delete("content-length")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  const init: RequestInit = { method: req.method, headers, redirect: "manual", signal: controller.signal }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  try {
    const upstream = await fetch(target, init)
    clearTimeout(timeout)
    const res = new NextResponse(upstream.body, { status: upstream.status })

    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie" || key.toLowerCase() === "content-length") return
      res.headers.set(key, value)
    })
    for (const cookie of upstream.headers.getSetCookie()) {
      res.headers.append("set-cookie", cookie)
    }

    return res
  } catch (e) {
    clearTimeout(timeout)
    const isAbort = e instanceof DOMException && e.name === "AbortError"
    console.error(`[auth proxy] ${req.method} ${target.pathname}${target.search} -> ${base} failed:`, isAbort ? "timeout 10s" : e instanceof Error ? e.message : String(e))
    const details = isAbort
      ? `Timeout ao contactar auth backend (${base}). Verifica BETTER_AUTH_URL no dashboard da web e conectividade entre web↔api.`
      : e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { success: false, error: { code: isAbort ? "AUTH_PROXY_TIMEOUT" : "AUTH_PROXY_ERROR", message: "Serviço de autenticação indisponível", details } },
      { status: 502 },
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
