"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontalIcon, MessagesSquareIcon, SlidersHorizontalIcon, ToggleLeftIcon, ToggleRightIcon, CopyIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@workspace/ui/components/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Button } from "@/components/ui/button";
import { listAdminAffiliateReferrals, updateAdminAffiliate } from "@/app/actions/admin";
import type { AffiliateAdminView } from "@workdeal/shared";

type AffiliateActionRow = Omit<AffiliateAdminView, "createdAt">;

interface ReferralRow {
  id: string;
  referredCompanyName: string | null;
  source: string;
  status: string;
  commissionAmountMzn: number | null;
  createdAt: string;
  convertedAt: string | null;
}

interface EarningRow {
  id: string;
  amountMzn: number;
  status: string;
  referredCompanyName: string | null;
  createdAt: string;
  paidAt: string | null;
}

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

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-MZ");
}

export function AffiliateActions({ affiliate, isAdmin }: { affiliate: AffiliateActionRow; isAdmin: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralsOpen, setReferralsOpen] = useState(false);
  const [referrals, setReferrals] = useState<{ referrals: ReferralRow[]; earnings: EarningRow[] } | null>(null);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">(affiliate.commissionType);
  const [commissionValue, setCommissionValue] = useState(String(affiliate.commissionValue));

  async function openReferrals() {
    setError(null);
    setBusy(true);
    try {
      const res = await listAdminAffiliateReferrals(affiliate.id);
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao carregar indicações");
        return;
      }
      const data = res.data as { referrals: ReferralRow[]; earnings: EarningRow[] } | null;
      setReferrals(data ?? { referrals: [], earnings: [] });
      setReferralsOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar indicações");
    } finally {
      setBusy(false);
    }
  }

  async function saveCommission() {
    setError(null);
    setBusy(true);
    try {
      const value = Math.trunc(Number(commissionValue));
      if (!Number.isFinite(value) || value < 0) {
        setError("Valor de comissão inválido");
        return;
      }
      const res = await updateAdminAffiliate(affiliate.id, { commissionType, commissionValue: value });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao guardar comissão");
        return;
      }
      setCommissionOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar comissão");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus() {
    setError(null);
    setBusy(true);
    try {
      const next = affiliate.status === "active" ? "suspended" : "active";
      const res = await updateAdminAffiliate(affiliate.id, { status: next });
      if (!res.success) {
        setError(res.error?.message ?? "Falha ao alterar estado");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao alterar estado");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(affiliate.code);
    } catch {
      // clipboard indisponível — ignora
    }
  }

  return (
    <div className="space-y-2">
      {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                disabled={busy}
                className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent disabled:opacity-50"
                aria-label={`Ações de ${affiliate.actorName}`}
              >
                <MoreHorizontalIcon className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {affiliate.actorName} · {affiliate.code}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem onClick={() => void openReferrals()} disabled={busy}>
              <MessagesSquareIcon /> Ver indicações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void copyCode()}>
              <CopyIcon /> Copiar código
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => setCommissionOpen(true)} disabled={busy}>
                  <SlidersHorizontalIcon /> Editar comissão
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void toggleStatus()} disabled={busy}>
                  {affiliate.status === "active" ? <ToggleLeftIcon /> : <ToggleRightIcon />}
                  {affiliate.status === "active" ? "Suspender" : "Reativar"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={referralsOpen} onOpenChange={setReferralsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Indicações de {affiliate.actorName}</DialogTitle>
            <DialogDescription>Empresas indicadas e comissões geradas.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresas indicadas</p>
              {!referrals || referrals.referrals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem indicações ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-1.5 font-medium">Empresa</th>
                      <th className="pb-1.5 font-medium">Origem</th>
                      <th className="pb-1.5 font-medium">Estado</th>
                      <th className="pb-1.5 text-right font-medium">Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.referrals.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="py-1.5">
                          <span className="block">{r.referredCompanyName ?? "Pendente"}</span>
                          <span className="block text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                        </td>
                        <td className="py-1.5">{r.source === "link" ? "Link" : "Código"}</td>
                        <td className="py-1.5">{REFERRAL_STATUS_LABELS[r.status] ?? r.status}</td>
                        <td className="py-1.5 text-right">{fmtMzn(r.commissionAmountMzn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comissões</p>
              {!referrals || referrals.earnings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem comissões ainda.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-1.5 font-medium">Empresa</th>
                      <th className="pb-1.5 font-medium">Valor</th>
                      <th className="pb-1.5 font-medium">Estado</th>
                      <th className="pb-1.5 text-right font-medium">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.earnings.map((e) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="py-1.5">{e.referredCompanyName ?? "—"}</td>
                        <td className="py-1.5">{fmtMzn(e.amountMzn)}</td>
                        <td className="py-1.5">{EARNING_STATUS_LABELS[e.status] ?? e.status}</td>
                        <td className="py-1.5 text-right">{fmtDate(e.paidAt ?? e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={commissionOpen} onOpenChange={setCommissionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comissão de {affiliate.code}</DialogTitle>
            <DialogDescription>Percentagem por factura paga ou valor fixo por conversão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={commissionType} onValueChange={(v) => setCommissionType(v === "fixed" ? "fixed" : "percent")}>
                <SelectTrigger className="h-9 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentagem (%)</SelectItem>
                  <SelectItem value="fixed">Valor fixo (MZN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3">
              <label className="text-sm font-medium">{commissionType === "percent" ? "Percentagem (%)" : "Valor fixo (MZN)"}</label>
              <input
                type="number"
                min={0}
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              {commissionType === "percent" && <p className="text-xs text-muted-foreground">Máximo 100%.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCommissionOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => void saveCommission()} disabled={busy}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}