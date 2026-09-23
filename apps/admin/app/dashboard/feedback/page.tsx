import Link from "next/link";
import { listFeedback, type AdminFeedbackItem } from "@/app/actions/support";
import { requireSystemRole } from "@/lib/auth";
import { FeedbackTriage } from "./feedback-triage";

export const metadata = {
  title: "Feedback | Workdeal Admin",
};

const KIND_LABELS: Record<string, string> = {
  suggestion: "Sugestões",
  bug: "Bugs",
  praise: "Elogios",
};

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; page?: string }> }) {
  await requireSystemRole("moderator", "admin");
  const { status, kind, page: pageParam } = await searchParams;
  const allowedStatus = ["open", "in_review", "resolved", "dismissed"];
  const allowedKind = Object.keys(KIND_LABELS);
  const activeStatus = status && allowedStatus.includes(status) ? status : "open";
  const activeKind = kind && allowedKind.includes(kind) ? kind : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  let items: AdminFeedbackItem[] = [];
  let total = 0;
  let error: string | null = null;
  try {
    const res = await listFeedback({ status: activeStatus, kind: activeKind, page });
    items = res.data ?? [];
    total = typeof res.meta?.total === "number" ? (res.meta.total as number) : items.length;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao carregar feedback.";
  }

  const qs = (s?: string, k?: string, p?: number) => {
    const params = new URLSearchParams();
    if (s && s !== "open") params.set("status", s);
    if (k) params.set("kind", k);
    if (p && p > 1) params.set("page", String(p));
    const str = params.toString();
    return `/dashboard/feedback${str ? `?${str}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
          Produto · Voz do utilizador
        </p>
        <h1
          className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Feedback
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          {total} registo{total === 1 ? "" : "s"} · triagem rápida com nota interna.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-2xl border border-[#D9D2C2] bg-white p-1.5">
        {["open", "in_review", "resolved", "dismissed"].map((s) => (
          <Link
            key={s}
            href={qs(s, activeKind, 1)}
            aria-current={activeStatus === s ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${activeStatus === s ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
          >
            {s === "open" ? "Abertos" : s === "in_review" ? "Em análise" : s === "resolved" ? "Resolvidos" : "Dispensados"}
          </Link>
        ))}
        <span className="mx-1 self-center h-5 w-px bg-[#D9D2C2]" aria-hidden />
        <Link
          href={qs(activeStatus, undefined, 1)}
          aria-current={!activeKind ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${!activeKind ? "bg-[#0B5E56] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
        >
          Todos tipos
        </Link>
        {Object.entries(KIND_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={qs(activeStatus, key, 1)}
            aria-current={activeKind === key ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${activeKind === key ? "bg-[#0B5E56] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF3B1F]/20 bg-[#FFF1EF] px-5 py-4 text-sm font-semibold text-[#7A1A0A]">
          {error}
        </div>
      ) : (
        <FeedbackTriage items={items} />
      )}

      {total > page * 25 ? (
        <div className="flex justify-end">
          <Link href={qs(activeStatus, activeKind, page + 1)} className="rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
            Seguinte →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
