import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

const TAG = "[data-proxy]"

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const route = path.join("/")
  const base = env.API_URL?.replace(/\/+$/, "") ?? "http://localhost:4000"
  const target = new URL(`${base}/api/v1/${route}`)
  target.search = req.nextUrl.search

  const hasAuth = req.headers.get("authorization")?.startsWith("Bearer ") ?? false
  const cookieNames = req.headers.get("cookie")?.split(";").map(c => c.trim().split("=")[0]) ?? []

  console.log(`${TAG} → ${req.method} /api/v1/${route}${req.nextUrl.search ? "?" + req.nextUrl.searchParams.toString() : ""}`)
  console.log(`${TAG}   API_URL resolved: ${base}`)
  console.log(`${TAG}   target: ${target.href}`)
  console.log(`${TAG}   auth: Bearer=${hasAuth}, cookies=[${cookieNames.join(", ")}]`)
  console.log(`${TAG}   VERCEL_URL=${process.env.VERCEL_URL ?? "(unset)"}`)
  console.log(`${TAG}   NODE_ENV=${process.env.NODE_ENV ?? "(unset)"}`)

  const headers = new Headers(req.headers)
  headers.set("host", target.host)
  headers.set("x-forwarded-host", req.headers.get("host") ?? "")
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""))
  headers.delete("content-length")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  const init: RequestInit = { method: req.method, headers, redirect: "manual", signal: controller.signal }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  const t0 = Date.now()
  try {
    const upstream = await fetch(target, init)
    clearTimeout(timeout)
    const elapsed = Date.now() - t0
    const contentType = upstream.headers.get("content-type") ?? ""
    const bodySnippet = contentType.includes("json")
      ? (await upstream.clone().text()).slice(0, 500)
      : `(non-json, ${contentType})`

    console.log(`${TAG} ← ${upstream.status} ${upstream.statusText} in ${elapsed}ms`)
    console.log(`${TAG}   content-type: ${contentType}`)
    console.log(`${TAG}   body[0..500]: ${bodySnippet}`)
    console.log(`${TAG}   upstream headers: ${JSON.stringify(Object.fromEntries(upstream.headers))}`)

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
    const elapsed = Date.now() - t0
    const isAbort = e instanceof DOMException && e.name === "AbortError"
    const errMsg = e instanceof Error ? e.message : String(e)
    console.error(`${TAG} ✖ ERROR after ${elapsed}ms: ${isAbort ? "TIMEOUT" : errMsg}`)
    console.error(`${TAG}   error type: ${e?.constructor?.name ?? typeof e}`)
    if (e instanceof TypeError) {
      console.error(`${TAG}   TypeError details — likely DNS/connect failure to: ${target.origin}`)
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isAbort ? "API_PROXY_TIMEOUT" : "API_PROXY_ERROR",
          message: "Serviço indisponível",
          details: isAbort ? `Timeout ao contactar API (${base})` : errMsg,
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
