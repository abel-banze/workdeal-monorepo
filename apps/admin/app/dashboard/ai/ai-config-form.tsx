"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAiSettings, testAiConnection, type SaveResult } from "./actions";

const PROVIDERS = ["mock", "google", "anthropic", "openai"] as const;
const TIERS = ["flash", "pro"] as const;
const MODEL_PROVIDERS = ["google", "anthropic", "openai"] as const;

export interface AiConfigFormProps {
  provider: string;
  envProvider: string;
  providerLabels: Record<string, string>;
  defaultMatrix: Record<string, Record<string, string>>;
  savedOverrides: Record<string, Record<string, string>>;
  budgets: { maxInputTokens: number; maxOutputTokens: number; maxCostUsd: number };
  isAdmin: boolean;
}

export function AiConfigForm({ provider, envProvider, providerLabels, defaultMatrix, savedOverrides, budgets, isAdmin }: AiConfigFormProps) {
  const [activeProvider, setActiveProvider] = useState(provider);
  const [flash, setFlash] = useState<Record<string, string>>(savedOverrides.flash ?? {});
  const [pro, setPro] = useState<Record<string, string>>(savedOverrides.pro ?? {});
  const [budget, setBudget] = useState({ ...budgets });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testResult, setTestResult] = useState<SaveResult | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const full = (rec: Record<string, string>) => ({
      google: rec.google ?? "",
      anthropic: rec.anthropic ?? "",
      openai: rec.openai ?? "",
    });
    const res = await saveAiSettings({
      provider: activeProvider as typeof PROVIDERS[number],
      modelOverrides: { flash: full(flash), pro: full(pro) },
      budgets: { ...budget },
    });
    setSaving(false);
    if (res.success) {
      setMessage({ kind: "ok", text: "Configuração guardada. Aplicada aos agentes em até 30s." });
    } else {
      setMessage({ kind: "err", text: res?.error?.message ?? "Falha ao guardar." });
    }
  }

  async function handleTest() {
    setTestResult(null);
    const res = await testAiConnection();
    setTestResult(res.success ? (res.data as SaveResult) : { ok: false, message: res.error?.message ?? "Falha." });
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        Apenas administradores podem alterar o provider, modelos e orçamentos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Provider activo</CardTitle>
          <CardDescription>
            Onde os agentes correm. "Modo demo" devolve respostas determinísticas sem custos. Sem config na BD usa
            o env <code className="rounded bg-muted px-1">AI_PROVIDER={envProvider}</code> como fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="grid gap-1 text-xs font-medium">
            Provider
            <select
              value={activeProvider}
              onChange={(e) => setActiveProvider(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{providerLabels[p] ?? p}</option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <div key={tier} className="rounded-md border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide">{tier === "flash" ? "Flash (rápido)" : "Pro (preciso)"}</p>
                <div className="space-y-2">
                  {MODEL_PROVIDERS.map((p) => {
                    const value = tier === "flash" ? flash : pro;
                    const def = defaultMatrix?.[tier]?.[p] ?? "";
                    return (
                      <label key={p} className="grid gap-1 text-xs">
                        <span className="text-muted-foreground">{providerLabels[p] ?? p}</span>
                        <input
                          value={value[p] ?? ""}
                          onChange={(e) => {
                            const next = { ...value, [p]: e.target.value.trim() };
                            if (tier === "flash") setFlash(next);
                            else setPro(next);
                          }}
                          placeholder={`default: ${def}`}
                          className="rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Deixar em branco = usar o modelo por defeito desse provider/tier.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Orçamentos globais (guardrails)</CardTitle>
          <CardDescription>Limites aplicados a cada pedido antes da chamada ao modelo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium">
            Máx. tokens de entrada
            <input
              type="number"
              min={1}
              value={String(budget.maxInputTokens ?? "")}
              onChange={(e) => setBudget((b) => ({ ...b, maxInputTokens: Number(e.target.value) }))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Máx. tokens de saída
            <input
              type="number"
              min={1}
              value={String(budget.maxOutputTokens ?? "")}
              onChange={(e) => setBudget((b) => ({ ...b, maxOutputTokens: Number(e.target.value) }))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Custo máx. por pedido (USD)
            <input
              type="number"
              min={0.001}
              step={0.001}
              value={String(budget.maxCostUsd ?? "")}
              onChange={(e) => setBudget((b) => ({ ...b, maxCostUsd: Number(e.target.value) }))}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </label>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "A guardar…" : "Guardar configuração"}
        </Button>
        <Button variant="outline" onClick={handleTest}>
          Testar ligação
        </Button>
      </div>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>{message.text}</p>
      )}
      {testResult && (
        <p className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>
          {testResult.message}
          {testResult.model ? ` (${testResult.model})` : ""}
          {testResult.latencyMs != null ? ` — ${testResult.latencyMs}ms` : ""}
        </p>
      )}
    </div>
  );
}