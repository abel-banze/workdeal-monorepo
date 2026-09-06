"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Check, ClipboardCheck, Users } from "lucide-react";
import { dashboardStatsSchema, type DashboardStats } from "@workdeal/shared";
import { ActivityChart } from "@/components/dashboard/activity-chart";

const DISPLAY_FONT = "var(--font-display)";

type ConnStatus = "live" | "reconnecting" | "offline";

const QUEUE_ITEMS: Array<{ key: keyof DashboardStats["queues"]; label: string; hint: string; href: string; dot?: string }> = [
  { key: "verificationsPending", label: "Verificações pendentes", hint: "Identidade de empresas por confirmar", href: "/dashboard/verifications" },
  { key: "preRegistrations", label: "Pré-registos", hint: "Empresas a confirmar convite", href: "/dashboard/organizations/pre-register" },
  { key: "tasksInReview", label: "Tarefas por moderar", hint: "Aguardam análise da equipa", href: "/dashboard/tasks/pending" },
  { key: "reportsPending", label: "Denúncias", hint: "Conteúdo assinalado", href: "/dashboard/reports" },
  { key: "eventsDraft", label: "Eventos por publicar", hint: "Rascunhos não publicados", href: "/dashboard/events" },
];

const KIND_META: Record<DashboardStats["recent"][number]["kind"], { label: string; chip: string }> = {
  perfil: { label: "Perfil", chip: "bg-[#0F1A2E] text-white" },
  tarefa: { label: "Tarefa", chip: "bg-[#0B5E56] text-white" },
  contacto: { label: "Contacto", chip: "bg-[#B27300] text-white" },
};

function timeAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return "agora";
  if (s < 60) return `há ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function LiveChip({ status, updatedAt, now }: { status: ConnStatus; updatedAt: number; now: number }) {
  const dot =
    status === "live"
      ? "bg-[#0B5E56] animate-pulse"
      : status === "reconnecting"
        ? "bg-[#B27300] animate-pulse"
        : "bg-[#FF3B1F] animate-pulse";
  const label =
    status === "live"
      ? `AO VIVO · HÁ ${Math.max(0, Math.round((now - updatedAt) / 1000))}S`
      : status === "reconnecting"
        ? "A RELIGAR…"
        : "SEM LIGAÇÃO";
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-[#D9D2C2] bg-white px-3.5 py-2 shadow-sm">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/60">{label}</span>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">{children}</p>;
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: DISPLAY_FONT }}>
      {children}
    </h2>
  );
}

export function DashboardOverview({ initial }: { initial: DashboardStats }) {
  const [stats, setStats] = useState(initial);
  const [status, setStatus] = useState<ConnStatus>("live");
  const [updatedAt, setUpdatedAt] = useState(() => Date.parse(initial.generatedAt));
  const errorCount = useRef(0);
  const now = useNow(1000);

  useEffect(() => {
    const es = new EventSource("/dashboard/live");
    es.onopen = () => {
      errorCount.current = 0;
      setStatus("live");
    };
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as { type: string } & Partial<DashboardStats>;
        if (msg.type === "stats") {
          const parsed = dashboardStatsSchema.safeParse(msg);
          if (parsed.success) {
            setStats(parsed.data);
            setStatus("live");
            errorCount.current = 0;
            setUpdatedAt(Date.parse(parsed.data.generatedAt));
          }
        }
      } catch {
        /* mensagem ignorada */
      }
    };
    es.onerror = () => {
      errorCount.current += 1;
      setStatus(errorCount.current >= 3 ? "offline" : "reconnecting");
    };
    return () => es.close();
  }, []);

  const counts = stats.counts;
  const queues = stats.queues;
  const queueTotal = QUEUE_ITEMS.reduce((sum, item) => sum + (queues[item.key] ?? 0), 0);
  const activeTotal = counts.profilesCompany + counts.profilesIndividual;
  const companyShare = activeTotal > 0 ? Math.round((counts.profilesCompany / activeTotal) * 100) : 0;
  const trend =
    stats.northStar.crescimento === null
      ? { text: "Sem base para comparar", tone: "text-white/50" }
      : stats.northStar.crescimento >= 0
        ? { text: `+${stats.northStar.crescimento}% que a semana anterior`, tone: "text-[#4FD1C5]" }
        : { text: `${stats.northStar.crescimento}% que a semana anterior`, tone: "text-white/60" };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Visão geral · Painel de equipa</Eyebrow>
          <h1 className="mt-2 text-[26px] font-black leading-tight tracking-[-0.04em] text-[#0F1A2E]" style={{ fontFamily: DISPLAY_FONT }}>
            Como está o mercado hoje
          </h1>
        </div>
        <LiveChip status={status} updatedAt={updatedAt} now={now} />
      </div>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#D9D2C2] shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-[#0F1A2E] p-5 text-white">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Conexões · 7 dias</p>
          <p className="mt-3 text-4xl font-black tracking-[-0.03em]" style={{ fontFamily: DISPLAY_FONT }}>
            {(stats.northStar.conexoesSemana ?? 0).toLocaleString("pt-PT")}
          </p>
          <p className={`mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${trend.tone}`}>{trend.text}</p>
        </div>

        <KpiCell
          icon={<Users className="size-4 text-[#0B5E56]" />}
          label="Utilizadores"
          value={counts.users}
          caption={`+${counts.usersWeek} esta semana`}
          href="/dashboard/users"
        />
        <KpiCell
          icon={<Building2 className="size-4 text-[#0B5E56]" />}
          label="Perfis activos"
          value={counts.profilesActive}
          caption={`${counts.profilesCompany} empresas · ${counts.profilesIndividual} profissionais`}
          href="/dashboard/profiles"
        />
        <KpiCell
          icon={<ClipboardCheck className="size-4 text-[#0B5E56]" />}
          label="Tarefas abertas"
          value={counts.tasksOpen}
          caption={`+${counts.tasksWeek} esta semana`}
          href="/dashboard/tasks"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl border border-[#D9D2C2] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <Eyebrow>Movimento · últimos 30 dias</Eyebrow>
                <PanelTitle>Como a plataforma está a crescer</PanelTitle>
              </div>
              <p className="text-xs text-[#0F1A2E]/50">
                Utilizadores novos, pré-registos, conversões e acção no directório por dia
              </p>
            </div>
            <div className="mt-4">
              <ActivityChart series={stats.series} />
            </div>
          </section>

          <section className="rounded-2xl border border-[#D9D2C2] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <Eyebrow>Actividade recente</Eyebrow>
                <PanelTitle>Aconteceu no directório</PanelTitle>
              </div>
            </div>
            {stats.recent.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#D9D2C2] py-8 text-center">
                <Check className="size-5 text-[#0B5E56]" />
                <p className="text-sm font-medium text-[#0F1A2E]/60">Sem registos recentes ainda</p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[#D9D2C2]/60">
                {stats.recent.map((item) => {
                  const meta = KIND_META[item.kind] ?? KIND_META.perfil;
                  const inner = (
                    <>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${meta.chip}`}>
                        {meta.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#0F1A2E]">{item.title ?? "Registo"}</span>
                      <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0F1A2E]/40">
                        {timeAgo(item.at, now)}
                      </span>
                      {item.href && <ArrowUpRight className="size-3.5 shrink-0 text-[#0F1A2E]/30" />}
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className="flex items-center gap-3 py-3 transition hover:bg-[#0B5E56]/[0.04]">
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 py-3">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#D9D2C2] bg-white p-5 shadow-sm">
            <Eyebrow>Moderação</Eyebrow>
            <PanelTitle>Para a tua atenção</PanelTitle>
            {queueTotal === 0 ? (
              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#0B5E56]/20 bg-[#0B5E56]/[0.05] p-4">
                <Check className="mt-0.5 size-4 shrink-0 text-[#0B5E56]" />
                <p className="text-sm leading-snug text-[#0F1A2E]/70">
                  Tudo em dia — as filas de moderação estão vazias.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {QUEUE_ITEMS.map((item) => {
                  const value = queues[item.key] ?? 0;
                  if (value === 0) return null;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="group flex items-center gap-3.5 rounded-xl border border-[#D9D2C2] bg-white px-3.5 py-3 transition hover:border-[#0B5E56]/40 hover:bg-[#0B5E56]/[0.03]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0F1A2E] font-mono text-sm font-black text-white">
                        {value.toLocaleString("pt-PT")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[#0F1A2E]">{item.label}</span>
                        <span className="block truncate text-xs text-[#0F1A2E]/45">{item.hint}</span>
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-[#0F1A2E]/25 transition group-hover:text-[#0B5E56]" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#D9D2C2] bg-white p-5 shadow-sm">
            <Eyebrow>Estrutura</Eyebrow>
            <PanelTitle>Composição do directório</PanelTitle>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#0F1A2E]">Empresas</span>
                <span className="font-mono text-xs font-bold text-[#0F1A2E]/50">{counts.profilesCompany.toLocaleString("pt-PT")}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#D9D2C2]/50">
                <div className="h-full rounded-full bg-[#0B5E56]" style={{ width: `${companyShare}%` }} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#0F1A2E]">Profissionais</span>
                <span className="font-mono text-xs font-bold text-[#0F1A2E]/50">{counts.profilesIndividual.toLocaleString("pt-PT")}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#D9D2C2]/50">
                <div
                  className="h-full rounded-full bg-[#0F1A2E]"
                  style={{ width: `${activeTotal > 0 ? 100 - companyShare : 0}%` }}
                />
              </div>
              {counts.profilesDraft > 0 && (
                <p className="rounded-lg border border-[#B27300]/25 bg-[#B27300]/[0.07] px-3 py-2 text-xs text-[#0F1A2E]/70">
                  <span className="font-mono font-bold text-[#B27300]">{counts.profilesDraft.toLocaleString("pt-PT")}</span> perfis em rascunho
                  ainda não publicados.
                </p>
              )}
              <Link
                href="/dashboard/profiles"
                className="flex items-center justify-between rounded-xl border border-[#D9D2C2] px-3.5 py-2.5 text-sm font-medium text-[#0B5E56] transition hover:border-[#0B5E56]/40 hover:bg-[#0B5E56]/[0.03]"
              >
                Gerir directório
                <ArrowUpRight className="size-4 text-[#0F1A2E]/25" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCell({
  icon,
  label,
  value,
  caption,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  href: string;
}) {
  return (
    <Link href={href} className="group bg-white p-5 transition hover:bg-[#0B5E56]/[0.03]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#0B5E56]/[0.08]">{icon}</span>
          <span className="text-sm font-semibold text-[#0F1A2E]">{label}</span>
        </span>
        <ArrowUpRight className="size-4 text-[#0F1A2E]/20 transition group-hover:text-[#0B5E56]" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: DISPLAY_FONT }}>
        {value.toLocaleString("pt-PT")}
      </p>
      <p className="mt-1 text-xs text-[#0F1A2E]/45">{caption}</p>
    </Link>
  );
}