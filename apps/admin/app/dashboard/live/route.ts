import type { NextRequest } from "next/server";
import { dashboardStatsSchema, type DashboardStats } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";
import { getServerSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUSH_INTERVAL_MS = 20_000;
const HEARTBEAT_MS = 12_000;

const encoder = new TextEncoder();

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session || (session.user.systemRole !== "admin" && session.user.systemRole !== "moderator")) {
    return Response.json({ success: false, error: { code: "UNAUTHORIZED", message: "Não autenticado" } }, { status: 401 });
  }

  let initial: DashboardStats;
  try {
    const envelope = await apiFetch<unknown>("/api/v1/admin/dashboard");
    const parsed = dashboardStatsSchema.safeParse(envelope.data);
    if (!parsed.success) {
      console.error("[dashboard/live] resposta da API inválida:", parsed.error.flatten());
      throw new Error("resposta inválida");
    }
    initial = parsed.data;
  } catch {
    return Response.json({ success: false, error: { code: "UNAVAILABLE", message: "Dashboard indisponível de momento" } }, { status: 503 });
  }

  let disconnected = false;
  const signal = request.signal;
  signal.addEventListener("abort", () => (disconnected = true), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (payload: unknown) => {
        if (disconnected) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* stream já fechado */
        }
      };
      const ping = () => {
        if (disconnected) return;
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          /* stream já fechado */
        }
      };

      enqueue({ type: "stats", ...initial });

      const heartbeat = setInterval(ping, HEARTBEAT_MS);

      let stopped = false;
      const tick = async () => {
        if (stopped || disconnected) return;
        try {
          const envelope = await apiFetch<unknown>("/api/v1/admin/dashboard");
          const parsed = dashboardStatsSchema.safeParse(envelope.data);
          if (parsed.success) {
            enqueue({ type: "stats", ...parsed.data });
          } else {
            enqueue({ type: "stale" });
          }
        } catch {
          enqueue({ type: "stale" });
        }
      };
      const loop = async () => {
        await tick();
        if (!stopped && !disconnected) setTimeout(loop, PUSH_INTERVAL_MS);
      };
      const timer = setTimeout(loop, PUSH_INTERVAL_MS);

      const cleanup = () => {
        stopped = true;
        disconnected = true;
        clearInterval(heartbeat);
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* já fechado */
        }
      };
      signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}