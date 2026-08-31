import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

async function proxy(req: NextRequest, ctx: { params: Promise<{ all: string[] }> }) {
  const { all } = await ctx.params;
  const base = env.BETTER_AUTH_URL?.replace(/\/+$/, "") ?? "http://localhost:4000";
  const target = new URL(`${base}/api/auth/${all.join("/")}`);
  target.search = req.nextUrl.search;

  const headers = new Headers(req.headers);
  headers.set("host", target.host);
  headers.set("x-forwarded-host", req.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", req.nextUrl.protocol.replace(":", ""));
  headers.delete("content-length");
  headers.delete("expect");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const init: RequestInit = { method: req.method, headers, redirect: "manual", signal: controller.signal };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(target, init);
    clearTimeout(timeout);
    const res = new NextResponse(upstream.body, { status: upstream.status });

    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === "set-cookie" || k === "content-length") return;
      if (k === "transfer-encoding" || k === "content-encoding" || k === "connection") return;
      res.headers.set(key, value);
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      const cleaned = cookie
        .replace(/;\s*Domain=[^;]*/gi, "")
        .replace(/;\s*Path=[^;]*/gi, "; Path=/");
      res.headers.append("set-cookie", cleaned);
    }

    return res;
  } catch (e) {
    clearTimeout(timeout);
    const isAbort = e instanceof DOMException && e.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isAbort ? "AUTH_PROXY_TIMEOUT" : "AUTH_PROXY_ERROR",
          message: "Serviço de autenticação indisponível",
          details: isAbort ? `Timeout ao contactar auth backend (${base})` : e instanceof Error ? e.message : String(e),
        },
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
