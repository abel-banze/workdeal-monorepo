"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createBroadcastCampaign,
  prepareBroadcastCampaign,
  sendBroadcastBatch,
  type BroadcastCampaignItem,
} from "@/app/actions/broadcast";

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
] as const;

const WA_TEMPLATES = ["workdeal_introduction", "onboarding_request", "quote_request", "tasks_cta", "new_tenders"];

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[#6B7280] text-white",
  ready: "bg-[#0B5E56] text-white",
  sending: "bg-[#0F1A2E] text-white",
  sent: "bg-[#0B5E56]/15 text-[#0B5E56]",
};

export function CampaignsManager({ initial: campaigns }: { initial: BroadcastCampaignItem[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [templateKey, setTemplateKey] = useState("tasks_cta");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { sent: number; failed: number; remaining: number; total: number }>>({});

  async function refresh() {
    router.refresh();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (busy || title.trim().length < 3) return;
    setBusy(true);
    try {
      await createBroadcastCampaign({
        title: title.trim(),
        channel,
        templateKey: channel === "whatsapp" ? templateKey : null,
        subject: channel === "email" ? subject.trim() || null : null,
        bodyHtml: channel === "email" || channel === "sms" ? bodyHtml.trim() || null : null,
      });
      setTitle("");
      setSubject("");
      setBodyHtml("");
      toast.success("Campanha criada como rascunho.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar campanha.");
    } finally {
      setBusy(false);
    }
  }

  async function onSend(campaign: BroadcastCampaignItem) {
    if (sendingId) return;
    setSendingId(campaign.id);
    try {
      let current = campaign;
      if (current.status === "draft") {
        const prepared = await prepareBroadcastCampaign(current.id);
        current = (prepared.data ?? current) as BroadcastCampaignItem;
        toast.success(`Audiência pronta: ${current.totalRecipients} destinatários.`);
      }
      for (;;) {
        const res = await sendBroadcastBatch(current.id, 25);
        const data = res.data as { sent: number; failed: number; remaining: number; total: number };
        setProgress((prev) => ({ ...prev, [current.id]: data }));
        if (data.remaining <= 0) break;
      }
      toast.success("Envio concluído.");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio.");
    } finally {
      setSendingId(null);
    }
  }

  const inputCls = "rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]";

  return (
    <div className="space-y-4">
      <form onSubmit={onCreate} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
        <h2 className="text-sm font-black text-[#0F1A2E]">Nova campanha</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título * ex: Convite concursos de Março" maxLength={160} aria-label="Título" className={inputCls} />
          <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} aria-label="Canal" className={inputCls}>
            {CHANNELS.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          {channel === "whatsapp" ? (
            <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} aria-label="Template WhatsApp" className={inputCls}>
              {WA_TEMPLATES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          ) : null}
          {channel === "email" ? (
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto * (podes usar {{company}})" maxLength={160} aria-label="Assunto" className={inputCls} />
          ) : null}
        </div>
        {channel !== "whatsapp" ? (
          <textarea
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            placeholder={channel === "email" ? "Conteúdo * (HTML; {{company}} = nome da empresa)" : "Mensagem SMS * ({{company}} = nome da empresa)"}
            rows={4}
            aria-label="Conteúdo"
            className="mt-3 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]"
          />
        ) : (
          <p className="mt-2 text-xs text-[#0F1A2E]/55">WhatsApp usa o template aprovado ({"{{1}}"} = nome da empresa).</p>
        )}
        <button type="submit" disabled={busy} className="mt-3 rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
          {busy ? "A criar…" : "Criar rascunho"}
        </button>
      </form>

      {campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D9D2C2] bg-white px-5 py-10 text-center text-sm text-[#0F1A2E]/50">
          Sem campanhas ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => {
            const prog = progress[c.id];
            const done = c.sentCount + c.failedCount;
            const pct = c.totalRecipients > 0 ? Math.round((done / c.totalRecipients) * 100) : 0;
            const sending = sendingId === c.id;
            return (
              <li key={c.id} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-[#0F1A2E]">{c.title}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[c.status] ?? ""}`}>{c.status}</span>
                  <span className="rounded-full border border-[#D9D2C2] px-2.5 py-0.5 text-[11px] font-bold text-[#0F1A2E]/60">{c.channel}</span>
                  {c.templateKey ? <span className="font-mono text-[11px] text-[#0F1A2E]/50">{c.templateKey}</span> : null}
                  <span className="ml-auto font-mono text-xs tabular-nums text-[#0F1A2E]/55">
                    {c.sentCount} enviadas · {c.failedCount} falhas · {c.totalRecipients} total
                  </span>
                </div>
                {(sending || pct > 0) && c.status !== "sent" ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F6F3EE]">
                    <div className="h-full rounded-full bg-[#0B5E56] transition-all" style={{ width: `${prog ? Math.round(((prog.sent + prog.failed) / Math.max(prog.total, 1)) * 100) : pct}%` }} />
                  </div>
                ) : null}
                {prog && sending ? (
                  <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/55">lote: +{prog.sent} enviadas, +{prog.failed} falhas, restam {prog.remaining}</p>
                ) : null}
                <div className="mt-3">
                  {c.status === "sent" ? (
                    <span className="text-xs font-bold text-[#0B5E56]">Concluída</span>
                  ) : (
                    <button
                      type="button"
                      disabled={sendingId !== null}
                      onClick={() => void onSend(c)}
                      className="rounded-full bg-[#FF3B1F] px-5 py-2 text-xs font-bold text-white hover:bg-[#E8350F] disabled:opacity-50"
                    >
                      {sending ? "A enviar…" : c.status === "draft" ? "Preparar e enviar" : "Continuar envio"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
