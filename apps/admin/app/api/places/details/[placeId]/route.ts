import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Proxy para os detalhes de um Google Places do backend (a chave fica server-side na API).
// Usado no formulário de pré-registo para capturar coordenadas + província/cidade ao escolher o lugar.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await ctx.params;
  if (!placeId || placeId.length > 200) {
    return NextResponse.json({ success: false, error: { code: "INVALID", message: "placeId inválido" } }, { status: 400 });
  }
  const base = env.API_URL.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/v1/places/details/${encodeURIComponent(placeId)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json().catch(() => ({ success: false, data: null }));
    return NextResponse.json(json, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "PLACES_UPSTREAM", message: "Não foi possível obter os detalhes do lugar" } },
      { status: 502 },
    );
  }
}
