import { getAiUsage } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Uso de IA | Workdeal Admin",
};

const AGENT_LABELS: Record<string, string> = {
  ai_assistant: "Assistente comercial",
  ai_proposal_generation: "Propostas",
  ai_response_support: "Respostas",
  ai_profile_assistant: "Assistente de perfil",
};

const PROVIDER_LABELS: Record<string, string> = {
  mock: "Modo demo",
  google: "Google Gemini",
  anthropic: "Anthropic Claude",
  openai: "OpenAI GPT",
};

function fmtMoney(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

export default async function AiUsagePage() {
  await requireSystemRole("moderator", "admin");

  const res = await getAiUsage();
  const data = (res.data ?? {}) as {
    totals: null | {
      runs: number;
      ok: number;
      errors: number;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      avgDurationMs: number;
    };
    byAgent: {
      agentKey: string;
      provider: string;
      runs: number;
      ok: number;
      errors: number;
      costUsd: number;
      errorRate: number;
    }[];
    byProvider: { provider: string; runs: number; costUsd: number }[];
    daily: { day: string; runs: number; costUsd: number }[];
    recent: {
      id: string;
      agentKey: string;
      provider: string;
      model: string;
      status: string;
      errorCode: string | null;
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
      durationMs: number;
      createdAt: string;
      organizationName: string | null;
      userId: string | null;
      userName: string | null;
    }[];
  };

  const totals = data.totals;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Uso de IA e custos</h1>
        <p className="text-sm text-muted-foreground">
          Telemetria registada por pedido dos agentes (agent_usage). O custo é estimado a partir dos tokens
          efectivamente utilizados e da tabela de preços dos modelos.
        </p>
      </div>

      {totals && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pedidos" value={String(totals.runs)} sub={`${totals.ok} ok · ${totals.errors} erros`} />
          <StatCard label="Tokens" value={String(totals.inputTokens + totals.outputTokens)} sub={`${totals.inputTokens} in · ${totals.outputTokens} out`} />
          <StatCard label="Custo estimado" value={fmtMoney(totals.costUsd)} sub="sum(estimatedCostUsd)" />
          <StatCard label="Duração média" value={`${totals.avgDurationMs}ms`} sub="por pedido" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Por agente</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleTable
              columns={["Agente", "Provider", "Pedidos", "Erros", "Custo"]}
              rows={data.byAgent.map((r) => [
                AGENT_LABELS[r.agentKey] ?? r.agentKey,
                PROVIDER_LABELS[r.provider] ?? r.provider,
                String(r.runs),
                r.errors ? <span className="text-red-600">{r.errors} ({r.errorRate}%)</span> : "0",
                fmtMoney(r.costUsd),
              ])}
              empty="Sem pedidos registados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Por provider</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleTable
              columns={["Provider", "Pedidos", "Custo"]}
              rows={data.byProvider.map((r) => [
                PROVIDER_LABELS[r.provider] ?? r.provider,
                String(r.runs),
                fmtMoney(r.costUsd),
              ])}
              empty="Sem pedidos registados."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimos 30 dias</CardTitle>
          <CardDescription>Pedidos e custo por dia.</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTable
            columns={["Dia", "Pedidos", "Custo"]}
            rows={data.daily.map((d) => [d.day, String(d.runs), fmtMoney(d.costUsd)])}
            empty="Sem pedidos neste período."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <SimpleTable
              columns={["Quando", "Agente", "Modelo", "Status", "Tokens", "Custo", "Empresa", "Utilizador"]}
              rows={data.recent.map((r) => [
                new Date(r.createdAt).toLocaleString("pt-MZ"),
                AGENT_LABELS[r.agentKey] ?? r.agentKey,
                <code key={r.id} className="font-mono text-xs">{r.model}</code>,
                r.status === "ok" ? (
                  <span className="text-emerald-600">ok</span>
                ) : (
                  <span className="text-red-600">{r.status}{r.errorCode ? ` (${r.errorCode})` : ""}</span>
                ),
                `${r.inputTokens + r.outputTokens}`,
                fmtMoney(r.costUsd),
                r.organizationName ?? "—",
                r.userName ?? r.userId?.slice(0, 8) ?? "—",
              ])}
              empty="Sem pedidos registados."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function SimpleTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
          {columns.map((c) => (
            <th key={c} className="py-2 pr-4 font-medium">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b last:border-0">
            {r.map((cell, j) => (
              <td key={j} className="py-2 pr-4 align-top">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}