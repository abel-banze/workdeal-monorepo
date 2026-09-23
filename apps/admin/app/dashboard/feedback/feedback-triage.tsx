"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateFeedback, type AdminFeedbackItem } from "@/app/actions/support";

const STATUS = [
  { key: "open", label: "Aberto" },
  { key: "in_review", label: "Em análise" },
  { key: "resolved", label: "Resolvido" },
  { key: "dismissed", label: "Dispensado" },
] as const;

export function FeedbackTriage({ items }: { items: AdminFeedbackItem[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function onStatus(id: string, status: string) {
    setBusy(id + status);
    try {
      await updateFeedback(id, { status, adminNote: notes[id]?.trim() || null });
      toast.success("Feedback actualizado.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao actualizar.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white px-5 py-10 text-center text-sm text-[#0F1A2E]/50">
        Sem feedback neste estado.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((f) => (
        <li key={f.id} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
          <p className="flex flex-wrap items-baseline gap-2 text-xs text-[#0F1A2E]/55">
            <span className="rounded-full bg-[#0F1A2E] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">{f.kind}</span>
            <span className="font-bold text-[#0F1A2E]">{f.userName ?? f.userEmail ?? "Utilizador"}</span>
            {f.orgName ? <span>· {f.orgName}</span> : null}
            <span className="ml-auto font-mono">{new Date(f.createdAt).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })}</span>
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#0F1A2E]/85">{f.message}</p>
          {f.page ? <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/45">origem: {f.page}</p> : null}
          {f.adminNote ? <p className="mt-2 rounded-xl bg-[#F6F3EE] px-3 py-2 text-xs text-[#0F1A2E]/70">Nota: {f.adminNote}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={notes[f.id] ?? ""}
              onChange={(e) => setNotes((prev) => ({ ...prev, [f.id]: e.target.value }))}
              placeholder="Nota interna (opcional)…"
              aria-label="Nota interna"
              className="min-w-[200px] flex-1 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
            />
            {STATUS.filter((s) => s.key !== f.status).map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={busy !== null}
                onClick={() => void onStatus(f.id, s.key)}
                className="rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE] disabled:opacity-50"
              >
                {busy === f.id + s.key ? "…" : s.label}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
