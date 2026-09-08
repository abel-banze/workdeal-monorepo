"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLAN_INTERVALS, PLAN_INTERVAL_LABELS_PT, type PlanInterval } from "@workdeal/shared";
import { createPlan, updatePlan, upsertPlanFeatures } from "@/app/actions/admin";

export interface PlanFormFeature {
  featureKey: string;
  featureValue: string | null;
  label: string | null;
}

export interface PlanFormInitial {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  inheritFromPlanId: string | null;
  priceMzn: number;
  interval: PlanInterval;
  trialDays: number;
  maxProfiles: number | null;
  maxTeamMembers: number | null;
  maxListings: number | null;
  maxBranches: number | null;
  apiAccess: boolean;
  maxApiCallsPerMonth: number | null;
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
  features: PlanFormFeature[];
  inheritedFeatures: PlanFormFeature[];
}

export interface PlanFormProps {
  mode: "create" | "edit";
  initial?: PlanFormInitial;
  planOptions?: { id: string; name: string }[];
}

function toNullableInt(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function PlanForm({ mode, initial, planOptions = [] }: PlanFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [inheritFromPlanId, setInheritFromPlanId] = useState(initial?.inheritFromPlanId ?? "");
  const [priceMzn, setPriceMzn] = useState(String(initial?.priceMzn ?? 0));
  const [interval, setInterval] = useState<PlanInterval>(initial?.interval ?? "monthly");
  const [trialDays, setTrialDays] = useState(String(initial?.trialDays ?? 0));
  const [maxProfiles, setMaxProfiles] = useState(initial?.maxProfiles != null ? String(initial.maxProfiles) : "");
  const [maxTeamMembers, setMaxTeamMembers] = useState(initial?.maxTeamMembers != null ? String(initial.maxTeamMembers) : "");
  const [maxListings, setMaxListings] = useState(initial?.maxListings != null ? String(initial.maxListings) : "");
  const [maxBranches, setMaxBranches] = useState(initial?.maxBranches != null ? String(initial.maxBranches) : "");
  const [apiAccess, setApiAccess] = useState(initial?.apiAccess ?? false);
  const [maxApiCallsPerMonth, setMaxApiCallsPerMonth] = useState(initial?.maxApiCallsPerMonth != null ? String(initial.maxApiCallsPerMonth) : "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? true);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [features, setFeatures] = useState<PlanFormFeature[]>(initial?.features ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\p{M}]/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function updateFeature(index: number, patch: Partial<PlanFormFeature>) {
    setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  }

  function addFeature() {
    setFeatures((prev) => [...prev, { featureKey: "", featureValue: null, label: null }]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const base = {
      name: name.trim(),
      description: description.trim() || null,
      inheritFromPlanId: inheritFromPlanId || null,
      priceMzn: Number(priceMzn) || 0,
      interval,
      trialDays: Number(trialDays) || 0,
      maxProfiles: toNullableInt(maxProfiles),
      maxTeamMembers: toNullableInt(maxTeamMembers),
      maxListings: toNullableInt(maxListings),
      maxBranches: toNullableInt(maxBranches),
      apiAccess,
      maxApiCallsPerMonth: toNullableInt(maxApiCallsPerMonth),
      isPublic,
      sortOrder: Number(sortOrder) || 0,
    };

    const cleanedFeatures = features
      .map((f) => ({
        featureKey: f.featureKey.trim(),
        featureValue: f.featureValue?.trim() || null,
        label: f.label?.trim() || null,
      }))
      .filter((f) => f.featureKey.length > 0);

    try {
      if (mode === "create") {
        const res = await createPlan({ ...base, slug: slug.trim() || generateSlug(name.trim()) });
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao criar plano");
        const created = res.data as { id: string };
        if (cleanedFeatures.length > 0) {
          const featRes = await upsertPlanFeatures(created.id, { planId: created.id, features: cleanedFeatures });
          if (!featRes.success) throw new Error(featRes.error?.message ?? "Falha ao guardar features");
        }
        router.push("/dashboard/plans");
        router.refresh();
      } else {
        const res = await updatePlan(initial!.id, base);
        if (!res.success) throw new Error(res.error?.message ?? "Falha ao actualizar plano");
        const featRes = await upsertPlanFeatures(initial!.id, { planId: initial!.id, features: cleanedFeatures });
        if (!featRes.success) throw new Error(featRes.error?.message ?? "Falha ao guardar features");
        router.push("/dashboard/plans");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar plano");
    } finally {
      setLoading(false);
    }
  }

  const numberInput = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="text-sm font-medium">Nome *</label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (mode === "create" && !slug) setSlug(generateSlug(e.target.value));
            }}
            placeholder="Ex: Premium"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="slug" className="text-sm font-medium">Slug *</label>
          <input
            id="slug"
            required
            value={slug}
            disabled={mode === "edit"}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ex: premium"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          />
          <p className="text-xs text-muted-foreground">
            {mode === "edit" ? "O slug é imutável após a criação." : "Apenas letras minúsculas, números e hífens."}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium">Descrição</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição opcional do plano"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="priceMzn" className="text-sm font-medium">Preço (MT) *</label>
            <input
              id="priceMzn"
              type="number"
              min={0}
              value={priceMzn}
              onChange={(e) => setPriceMzn(e.target.value)}
              className={numberInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="interval" className="text-sm font-medium">Período *</label>
            <select
              id="interval"
              value={interval}
              onChange={(e) => setInterval(e.target.value as PlanInterval)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PLAN_INTERVALS.map((i) => (
                <option key={i} value={i}>{PLAN_INTERVAL_LABELS_PT[i]}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="trialDays" className="text-sm font-medium">Teste (dias)</label>
            <input
              id="trialDays"
              type="number"
              min={0}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className={numberInput}
            />
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4 space-y-4">
        <h3 className="text-sm font-semibold">Limites</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="inheritFromPlanId" className="text-sm font-medium">Herda de</label>
            <select
              id="inheritFromPlanId"
              value={inheritFromPlanId}
              onChange={(e) => setInheritFromPlanId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Nenhum</option>
              {planOptions
                .filter((p) => p.id !== initial?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxProfiles" className="text-sm font-medium">Máx. perfis</label>
            <input
              id="maxProfiles"
              type="number"
              min={1}
              value={maxProfiles}
              onChange={(e) => setMaxProfiles(e.target.value)}
              placeholder="Ilimitado"
              className={numberInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxTeamMembers" className="text-sm font-medium">Máx. membros</label>
            <input
              id="maxTeamMembers"
              type="number"
              min={1}
              value={maxTeamMembers}
              onChange={(e) => setMaxTeamMembers(e.target.value)}
              placeholder="Ilimitado"
              className={numberInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxListings" className="text-sm font-medium">Máx. anúncios</label>
            <input
              id="maxListings"
              type="number"
              min={1}
              value={maxListings}
              onChange={(e) => setMaxListings(e.target.value)}
              placeholder="Ilimitado"
              className={numberInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxBranches" className="text-sm font-medium">Máx. sucursais</label>
            <input
              id="maxBranches"
              type="number"
              min={1}
              value={maxBranches}
              onChange={(e) => setMaxBranches(e.target.value)}
              placeholder="Ilimitado"
              className={numberInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="maxApiCallsPerMonth" className="text-sm font-medium">Máx. chamadas API/mês</label>
            <input
              id="maxApiCallsPerMonth"
              type="number"
              min={1}
              value={maxApiCallsPerMonth}
              onChange={(e) => setMaxApiCallsPerMonth(e.target.value)}
              placeholder="Ilimitado"
              className={numberInput}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="apiAccess"
            checked={apiAccess}
            onChange={(e) => setApiAccess(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor="apiAccess" className="text-sm font-medium">Acesso à API</label>
        </div>
      </div>

      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Features</h3>
          <Button type="button" variant="outline" size="sm" onClick={addFeature}>
            + Adicionar feature
          </Button>
        </div>

        {features.length === 0 && (
          <p className="text-sm text-muted-foreground">Sem features próprias. Este plano herda features do plano pai, se definido.</p>
        )}

        <div className="space-y-2">
          {features.map((f, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <input
                value={f.featureKey}
                onChange={(e) => updateFeature(i, { featureKey: e.target.value })}
                placeholder="Chave (ex: listings)"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <input
                value={f.featureValue ?? ""}
                onChange={(e) => updateFeature(i, { featureValue: e.target.value })}
                placeholder="Valor (ex: 20)"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <input
                value={f.label ?? ""}
                onChange={(e) => updateFeature(i, { label: e.target.value })}
                placeholder="Rótulo (ex: 20 anúncios)"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
              <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={() => removeFeature(i)}>
                Remover
              </Button>
            </div>
          ))}
        </div>

        {(initial?.inheritedFeatures.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Features herdadas (do plano pai, só leitura):</p>
            <ul className="space-y-1 text-sm">
              {initial!.inheritedFeatures.map((f) => (
                <li key={f.featureKey} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{f.label || f.featureKey}</span>
                  <span className="text-right">{f.featureValue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="sortOrder" className="text-sm font-medium">Ordem</label>
          <input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={numberInput}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="size-4 rounded border-input"
          />
          <label htmlFor="isPublic" className="text-sm font-medium">Público</label>
        </div>
        {mode === "edit" && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <label htmlFor="isActive" className="text-sm font-medium">Activo</label>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "A guardar…" : mode === "create" ? "Criar plano" : "Guardar alterações"}
        </Button>
        <Button variant="outline" type="button" onClick={() => router.push("/dashboard/plans")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}