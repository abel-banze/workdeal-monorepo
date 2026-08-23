import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

async function proxy(req: NextRequest, ctx: { params: Promise<{ all: string[] }> }) {
  const { all } = await ctx.params
  const target = new URL(`${env.BETTER_AUTH_URL}/api/auth/${all.join("/")}`)
  target.search = req.nextUrl.search

  const headers = new Headers(req.headers)
  headers.set("host", target.host)
  headers.set("x-forwarded-host", req.headers.get("host") ?? "")
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""))
  headers.delete("content-length")

  const init: RequestInit = { method: req.method, headers, redirect: "manual" }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const res = new NextResponse(upstream.body, { status: upstream.status })

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie" || key.toLowerCase() === "content-length") return
    res.headers.set(key, value)
  })
  for (const cookie of upstream.headers.getSetCookie()) {
    res.headers.append("set-cookie", cookie)
  }

  return res
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
