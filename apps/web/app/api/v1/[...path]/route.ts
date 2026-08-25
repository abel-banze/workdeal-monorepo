import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const base = env.API_URL?.replace(/\/+$/, "") ?? "http://localhost:4000"
  const target = new URL(`${base}/api/v1/${path.join("/")}`)
  target.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.set("host", target.host)
  headers.delete("content-length")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  const init: RequestInit = { method: req.method, headers, redirect: "manual", signal: controller.signal }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  try {
    const upstream = await fetch(target, init)
    clearTimeout(timeout)
    const res = new NextResponse(upstream.body, { status: upstream.status })

    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase()
      if (k === "set-cookie" || k === "content-length") return
      if (k === "transfer-encoding" || k === "content-encoding" || k === "connection") return
      res.headers.set(key, value)
    })

    return res
  } catch (e) {
    clearTimeout(timeout)
    const isAbort = e instanceof DOMException && e.name === "AbortError"
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isAbort ? "API_PROXY_TIMEOUT" : "API_PROXY_ERROR",
          message: "Serviço indisponível",
          details: isAbort ? `Timeout ao contactar API (${base})` : e instanceof Error ? e.message : String(e),
        },
      },
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
