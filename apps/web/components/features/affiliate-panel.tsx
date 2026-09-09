"use client";

import { useState } from "react";
import type { AffiliateDashboard } from "@workdeal/shared";

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  attributed: "Indicada",
  converted: "Convertida",
  voided: "Cancelada",
};
const EARNING_STATUS_LABELS: Record<string, string> = {
  pending: "A processar",
  paid: "Paga",
  cancelled: "Cancelada",
};

function fmtMzn(v: number | null | undefined): string {
  return v == null ? "—" : `${v.toLocaleString("pt-MZ")} MZN`;
}

function fmtDate(v: Date | string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-MZ");
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function AffiliatePanel({ initial }: { initial: AffiliateDashboard }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(key: string, value: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    }
  }

  const aff = initial.affiliate;

  if (!aff) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-[20px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Programa de Indicações
          </h1>
          <p className="text-sm text-[#0F1A2E]/60">Convidar empresas para a Workdeal e ganhar quando elas crescem.</p>
        </div>
        <div className="rounded-[20px] border border-[#D9D2C2] bg-[#F6F3EE] p-6">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">AINDA NÃO ÉS AFILIADO</p>
          <h2 className="mt-2 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Indica uma empresa e ganha com cada factura paga
          </h2>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-[#0F1A2E]/60">
            Recebes um código e um link próprio. Quando uma empresa indicada cria a conta e paga a primeira factura, ganhas uma comissão — em percentagem ou valor fixo, definido pela Workdeal.
          </p>
          <p className="mt-4 inline-flex rounded-full bg-[#0B5E56]/10 px-3 py-1.5 text-xs font-medium text-[#0B5E56]">
            A equipa Workdeal ativa o teu programa. Fala com o teu contacto para começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Programa de Indicações
          </h1>
          <p className="text-sm text-[#0F1A2E]/60">
            Como {aff.actorName}: <span className="font-bold text-[#0F1A2E]">{aff.code}</span> · comissão {aff.commissionType === "percent" ? `${aff.commissionValue}%` : `${fmtMzn(aff.commissionValue)} por conversão`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${aff.status === "active" ? "bg-[#0B5E56]/10 text-[#0B5E56]" : "bg-[#FF3B1F]/10 text-[#7A1A0A]"}`}>
          {aff.status === "active" ? "Activo" : "Suspendido"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/40">TEU CÓDIGO</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="rounded-xl border border-dashed border-[#0B5E56]/40 bg-[#0B5E56]/5 px-4 py-2 font-mono text-lg font-black tracking-widest text-[#0B5E56]">{aff.code}</span>
            <button
              type="button"
              onClick={() => void handleCopy("code", aff.code)}
              className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-2 text-xs font-bold text-[#0F1A2E] transition hover:border-[#0B5E56] hover:text-[#0B5E56]"
            >
              {copied === "code" ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#0F1A2E]/50">Partilha este código — quem se regista pode usá-lo no passo de identificação.</p>
        </div>
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/40">TEU LINK</p>
          <div className="mt-2 flex items-center gap-3">
            <input
              readOnly
              value={initial.inviteLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 font-mono text-xs text-[#0F1A2E] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCopy("link", initial.inviteLink)}
              className="shrink-0 rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
            >
              {copied === "link" ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#0F1A2E]/50">Quem abrir este link já chega com o teu código preenchido no registo.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Empresas convidadas", value: String(initial.totals.companiesInvited) },
          { label: "Conversões", value: String(initial.totals.conversions) },
          { label: "A ganhar (Pendente)", value: fmtMzn(initial.totals.pendingMzn) },
          { label: "Comissões pagas", value: fmtMzn(initial.totals.paidMzn) },
        ].map((s) => (
          <div key={s.label} className="rounded-[16px] border border-[#D9D2C2] bg-white p-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/40">{s.label.toUpperCase()}</p>
            <p className="mt-1 text-xl font-black text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">EMPRESAS INDICADAS</p>
          <div className="mt-3">
            {initial.referrals.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#0F1A2E]/50">Ainda não indicaste nenhuma empresa.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D9D2C2] text-left text-[11px] uppercase tracking-wider text-[#0F1A2E]/40">
                    <th className="pb-2 pr-3">Empresa</th>
                    <th className="pb-2 pr-3">Origem</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 text-right">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {initial.referrals.map((r) => (
                    <tr key={r.id} className="border-b border-[#F1ECDF] last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="block font-semibold text-[#0F1A2E]">{r.referredCompanyName ?? "Pendente"}</span>
                        <span className="block text-xs text-[#0F1A2E]/40">{fmtDate(r.createdAt)}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-[#0F1A2E]/60">{r.source === "link" ? "Link" : "Código"}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${r.status === "converted" ? "bg-[#0B5E56]/10 text-[#0B5E56]" : r.status === "voided" ? "bg-[#FF3B1F]/10 text-[#7A1A0A]" : "bg-[#0F1A2E]/5 text-[#0F1A2E]/60"}`}>
                          {REFERRAL_STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#0F1A2E]">{fmtMzn(r.commissionAmountMzn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">COMISSÕES</p>
          <div className="mt-3">
            {initial.earnings.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#0F1A2E]/50">Sem comissões ainda — aparecem quando uma empresa indicada paga a 1ª factura.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#D9D2C2] text-left text-[11px] uppercase tracking-wider text-[#0F1A2E]/40">
                    <th className="pb-2 pr-3">Empresa</th>
                    <th className="pb-2 pr-3">Valor</th>
                    <th className="pb-2 pr-3">Estado</th>
                    <th className="pb-2 text-right">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {initial.earnings.map((e) => (
                    <tr key={e.id} className="border-b border-[#F1ECDF] last:border-0">
                      <td className="py-2.5 pr-3 font-semibold text-[#0F1A2E]">{e.referredCompanyName ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-bold text-[#0B5E56]">{fmtMzn(e.amountMzn)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${e.status === "paid" ? "bg-[#0B5E56]/10 text-[#0B5E56]" : e.status === "cancelled" ? "bg-[#FF3B1F]/10 text-[#7A1A0A]" : "bg-[#0F1A2E]/5 text-[#0F1A2E]/60"}`}>
                          {EARNING_STATUS_LABELS[e.status] ?? e.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-[#0F1A2E]/60">{fmtDate(e.paidAt ?? e.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}