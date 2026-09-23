"use client";

import { useState } from "react";
import { toast } from "sonner";
import { searchBroadcastOrganizations, sendIndividualMessage } from "@/app/actions/broadcast";

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
] as const;

const WA_TEMPLATES = ["workdeal_introduction", "onboarding_request", "quote_request", "tasks_cta", "new_tenders"];

export function IndividualComposer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string }[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [searching, setSearching] = useState(false);
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [to, setTo] = useState("");
  const [templateKey, setTemplateKey] = useState("tasks_cta");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    try {
      setResults(await searchBroadcastOrganizations(query.trim()));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na pesquisa.");
    } finally {
      setSearching(false);
    }
  }

  function pickOrg(id: string, name: string) {
    setOrgId(id);
    setOrgName(name);
    setResults([]);
    setQuery("");
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setLastResult(null);
    try {
      const res = await sendIndividualMessage({
        organizationId: orgId,
        channel,
        to: orgId ? null : to.trim() || null,
        templateKey: channel === "whatsapp" ? templateKey : null,
        subject: channel === "email" ? subject.trim() || null : null,
        body: channel === "email" || channel === "sms" ? body.trim() || null : null,
      });
      const data = res.data as { address: string; outcome: string } | null;
      setLastResult(`Enviado para ${data?.address ?? "?"} (${data?.outcome ?? "?"})`);
      toast.success("Mensagem enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]";

  return (
    <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
      <h2 className="text-sm font-black text-[#0F1A2E]">Envio individual</h2>
      <p className="mt-1 text-xs text-[#0F1A2E]/55">Uma empresa (resolve o contacto) ou um endereço directo, em qualquer canal.</p>

      <form onSubmit={onSend} className="mt-4 space-y-3">
        <div>
          <p className="text-xs font-bold text-[#0F1A2E]">Destinatário {orgName ? <span className="text-[#0B5E56]">· {orgName}</span> : null}</p>
          {orgId ? (
            <button type="button" onClick={() => { setOrgId(null); setOrgName(""); }} className="mt-1 text-xs font-semibold text-[#FF3B1F] hover:underline">
              Trocar empresa
            </button>
          ) : (
            <div className="mt-1 flex gap-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar empresa…" aria-label="Pesquisar empresa" className={`${inputCls} flex-1`} />
              <button onClick={onSearch} disabled={searching || query.trim().length < 2} className="shrink-0 rounded-full border border-[#D9D2C2] px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE] disabled:opacity-50">
                {searching ? "…" : "Pesquisar"}
              </button>
            </div>
          )}
          {results.length > 0 ? (
            <ul className="mt-2 divide-y divide-[#D9D2C2]/60 rounded-xl border border-[#D9D2C2]">
              {results.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => pickOrg(r.id, r.name)} className="w-full px-3 py-2 text-left text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!orgId ? (
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Ou endereço directo (telefone/email)…" aria-label="Endereço directo" className={`${inputCls} mt-2 w-full`} />
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto * ({{company}} disponível)" aria-label="Assunto" className={inputCls} />
          ) : null}
        </div>

        {channel !== "whatsapp" ? (
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={channel === "email" ? "Conteúdo * (HTML; {{company}})" : "Mensagem SMS * ({{company}})"} rows={4} aria-label="Conteúdo" className="w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-sm text-[#0F1A2E] outline-none focus:border-[#0B5E56]" />
        ) : (
          <p className="text-xs text-[#0F1A2E]/55">WhatsApp usa o template aprovado ({"{{1}}"} = nome da empresa).</p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
            {busy ? "A enviar…" : "Enviar agora"}
          </button>
          {lastResult ? <span className="text-xs font-semibold text-[#0B5E56]">{lastResult}</span> : null}
        </div>
      </form>
    </div>
  );
}
