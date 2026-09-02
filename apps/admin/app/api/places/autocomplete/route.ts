import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Proxy para o autocomplete de Google Places do backend (a chave fica server-side na API).
// Rota pública e rate-limited pelo backend — usada no formulário de pré-registo.
export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get("input");
  if (!input || !input.trim()) {
    return NextResponse.json({ success: true, data: [] });
  }
  const base = env.API_URL.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/v1/places/autocomplete?input=${encodeURIComponent(input)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({ success: false, data: [] }));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: "PLACES_UPSTREAM", message: "Não foi possível pesquisar lugares" } },
      { status: 502 },
    );
  }
}
