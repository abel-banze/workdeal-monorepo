import Link from "next/link";
import { getOnboardingFunnel, getOnboardingEvents, type OnboardingFunnelData, type OnboardingEventItem } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { ONBOARDING_ACTION_LABELS_PT, type OnboardingEventAction } from "@workdeal/shared";

export const metadata = {
  title: "Funil onboarding | Workdeal Admin",
};

const PERIODS = [7, 30, 90];

const EVENT_ACTIONS = Object.keys(ONBOARDING_ACTION_LABELS_PT) as OnboardingEventAction[];

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Detalhe legível por tipo de evento (a partir do metadata). */
function eventDetail(item: OnboardingEventItem): string {
  const m = (item.metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  switch (item.action) {
    case "validation_failed": {
      const fields = strArr(m.fields);
      return fields.length > 0 ? `campos: ${fields.join(", ")}` : "";
    }
    case "otp_requested":
    case "otp_verified":
      return str(m.channel) ? `canal: ${str(m.channel)}` : "";
    case "otp_failed": {
      const how = str(m.reason) || str(m.error);
      return [str(m.channel) ? `canal: ${str(m.channel)}` : "", how].filter(Boolean).join(" · ");
    }
    case "company_create_failed":
      return str(m.error);
    case "step_next":
    case "step_back":
      return typeof m.from === "number" ? `do passo ${m.from}` : "";
    case "onboarding_abandoned":
    case "company_created":
      return typeof m.elapsedSeconds === "number" ? `${m.elapsedSeconds}s no fluxo` : "";
    default:
      return "";
  }
}

function fmtDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}min`;
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ""}`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0F1A2E]/45">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#0F1A2E]/55">{hint}</p> : null}
    </div>
  );
}

function FunnelBar({ label, users, max, accent }: { label: string; users: number; max: number; accent?: boolean }) {
  const pct = max > 0 ? Math.round((users / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-bold text-[#0F1A2E]">{label}</span>
        <span className="font-mono text-xs font-bold tabular-nums text-[#0F1A2E]/60">
          {users} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#F6F3EE]">
        <div
          className={`h-full rounded-full transition-all ${accent ? "bg-[#0B5E56]" : "bg-[#0F1A2E]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function OnboardingFunnelPage({ searchParams }: { searchParams: Promise<{ days?: string; action?: string; step?: string; page?: string }> }) {
  await requireSystemRole("moderator", "admin");
  const { days: daysParam, action: actionParam, step: stepParam, page: pageParam } = await searchParams;
  const days = [7, 30, 90].includes(Number(daysParam)) ? Number(daysParam) : 30;
  const actionFilter = (EVENT_ACTIONS as string[]).includes(actionParam ?? "") ? actionParam! : undefined;
  const stepFilter = ["0", "1", "2"].includes(stepParam ?? "") ? Number(stepParam) : undefined;
  const page = Math.max(1, Number(pageParam) || 1);

  let funnel: OnboardingFunnelData | null = null;
  let events: OnboardingEventItem[] = [];
  let eventsTotal = 0;
  let error: string | null = null;
  try {
    const [fRes, eRes] = await Promise.all([
      getOnboardingFunnel(days),
      getOnboardingEvents({ action: actionFilter, step: stepFilter, days, page }),
    ]);
    funnel = fRes.data ?? null;
    events = eRes.data ?? [];
    eventsTotal = typeof eRes.meta?.total === "number" ? (eRes.meta.total as number) : events.length;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao carregar funil.";
  }

  const completionRate = funnel && funnel.started > 0 ? Math.round((funnel.completed / funnel.started) * 100) : 0;
  const maxReach = Math.max(funnel?.started ?? 0, 1);
  const stepNames = ["0 · Empresa", "1 · Contactos", "2 · Presença"];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Utilizadores · Funil de onboarding
          </p>
          <h1
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Funil onboarding
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
            Onde os utilizadores param e porquê: alcance por passo, erros de validação, fricção do OTP e tempo até concluir.
          </p>
        </div>
        <div className="flex gap-1.5 rounded-full border border-[#D9D2C2] bg-white p-1">
          {PERIODS.map((d) => (
            <Link
              key={d}
              href={`/dashboard/users/onboarding${d === 30 ? "" : `?days=${d}`}`}
              aria-current={d === days ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${d === days ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#FF3B1F]/20 bg-[#FFF1EF] px-5 py-4 text-sm font-semibold text-[#7A1A0A]">
          {error}
        </div>
      ) : funnel ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Começaram" value={String(funnel.started)} hint={`últimos ${funnel.days} dias`} />
            <Stat label="Concluíram" value={String(funnel.completed)} hint={`${completionRate}% de conclusão`} />
            <Stat label="Abandonaram" value={String(funnel.abandoned)} hint="começaram sem concluir" />
            <Stat label="Tempo mediano" value={fmtDuration(funnel.medianSecondsToComplete)} hint="1º passo → empresa criada" />
          </div>

          <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
            <h2 className="text-sm font-black text-[#0F1A2E]">Alcance por passo</h2>
            <div className="mt-4 space-y-4">
              {stepNames.map((label, i) => (
                <FunnelBar key={label} label={label} users={funnel.reachedStep[String(i)] ?? 0} max={maxReach} />
              ))}
              <FunnelBar label="Concluíram" users={funnel.completed} max={maxReach} accent />
            </div>
            {funnel.abandonByLastStep.length > 0 ? (
              <p className="mt-4 text-xs text-[#0F1A2E]/55">
                Último passo dos que abandonaram:{" "}
                {funnel.abandonByLastStep.map((r) => `passo ${r.step ?? "?"} (${r.users})`).join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
              <h2 className="text-sm font-black text-[#0F1A2E]">Erros de validação por campo</h2>
              {funnel.validationErrors.length === 0 ? (
                <p className="mt-2 text-xs text-[#0F1A2E]/50">Sem erros registados no período.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#D9D2C2]/60">
                  {funnel.validationErrors.map((r) => (
                    <li key={r.field} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                      <span className="font-mono font-bold text-[#0F1A2E]">{r.field}</span>
                      <span className="font-mono text-xs font-bold tabular-nums text-[#FF3B1F]">{r.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
              <h2 className="text-sm font-black text-[#0F1A2E]">OTP por canal</h2>
              {funnel.otp.length === 0 ? (
                <p className="mt-2 text-xs text-[#0F1A2E]/50">Sem eventos OTP no período.</p>
              ) : (
                <ul className="mt-3 divide-y divide-[#D9D2C2]/60">
                  {funnel.otp.map((r) => (
                    <li key={`${r.channel}-${r.action}`} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                      <span className="text-[#0F1A2E]">
                        <span className="font-bold">{r.channel ?? "?"}</span>
                        <span className="text-[#0F1A2E]/55"> · {r.action.replace("otp_", "")}</span>
                      </span>
                      <span className="font-mono text-xs font-bold tabular-nums text-[#0F1A2E]/70">{r.count}×</span>
                    </li>
                  ))}
                </ul>
              )}
              {funnel.createFailures.length > 0 ? (
                <>
                  <h3 className="mt-5 text-xs font-black uppercase tracking-wider text-[#0F1A2E]/60">Falhas ao criar empresa</h3>
                  <ul className="mt-2 space-y-1.5">
                    {funnel.createFailures.map((r, i) => (
                      <li key={i} className="rounded-xl bg-[#FFF1EF] px-3 py-2 text-xs text-[#7A1A0A]">
                        <span className="font-bold">{r.count}×</span> {r.error ?? "(sem motivo)"}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
          {/* Explorar eventos — drill-down com identidade */}
          <div className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#0F1A2E]">Explorar eventos</h2>
                <p className="mt-0.5 text-xs text-[#0F1A2E]/55">
                  {eventsTotal} evento{eventsTotal === 1 ? "" : "s"} · com utilizador, empresa e detalhe
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={eventsHref({ days, page: 1 })}
                  aria-current={!actionFilter && stepFilter === undefined ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${!actionFilter && stepFilter === undefined ? "bg-[#0F1A2E] text-white" : "border border-[#D9D2C2] text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
                >
                  Todos
                </Link>
                {EVENT_ACTIONS.filter((a) => a !== "step_view").map((a) => (
                  <Link
                    key={a}
                    href={eventsHref({ days, action: a, page: 1 })}
                    aria-current={actionFilter === a && stepFilter === undefined ? "page" : undefined}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${actionFilter === a && stepFilter === undefined ? "bg-[#0F1A2E] text-white" : "border border-[#D9D2C2] text-[#0F1A2E]/60 hover:bg-[#F6F3EE]"}`}
                  >
                    {ONBOARDING_ACTION_LABELS_PT[a]}
                  </Link>
                ))}
              </div>
            </div>

            {events.length === 0 ? (
              <p className="mt-4 text-xs text-[#0F1A2E]/50">Sem eventos para este filtro no período.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#D9D2C2] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/45">
                      <th scope="col" className="py-2 pr-3">Quando</th>
                      <th scope="col" className="py-2 pr-3">Utilizador</th>
                      <th scope="col" className="py-2 pr-3">Empresa</th>
                      <th scope="col" className="py-2 pr-3">Passo</th>
                      <th scope="col" className="py-2 pr-3">Ação</th>
                      <th scope="col" className="py-2">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9D2C2]/60">
                    {events.map((ev) => (
                      <tr key={ev.id} className="align-top">
                        <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-[#0F1A2E]/60">{fmtDateTime(ev.createdAt)}</td>
                        <td className="py-2.5 pr-3">
                          <span className="block font-bold text-[#0F1A2E]">{ev.userName ?? "Anónimo"}</span>
                          {ev.userEmail ? <span className="block truncate text-xs text-[#0F1A2E]/55">{ev.userEmail}</span> : null}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-[#0F1A2E]/70">
                          {ev.companies.length > 0 ? ev.companies.join(", ") : <span className="text-[#0F1A2E]/40">—</span>}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs font-bold text-[#0F1A2E]/70">{ev.step ?? "—"}</td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ${ev.action === "company_created" ? "bg-[#0B5E56] text-white" : ev.action === "validation_failed" || ev.action === "company_create_failed" || ev.action === "otp_failed" ? "bg-[#FF3B1F]/10 text-[#7A1A0A]" : "bg-[#F6F3EE] text-[#0F1A2E]/70"}`}>
                            {ONBOARDING_ACTION_LABELS_PT[ev.action as OnboardingEventAction] ?? ev.action}
                          </span>
                        </td>
                        <td className="max-w-[280px] py-2.5 text-xs leading-relaxed text-[#0F1A2E]/70">{eventDetail(ev) || <span className="text-[#0F1A2E]/35">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-[11px] text-[#0F1A2E]/45">
                Página {page} · {events.length} de {eventsTotal}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link href={eventsHref({ days, action: actionFilter, step: stepFilter, page: page - 1 })} className="rounded-full border border-[#D9D2C2] px-4 py-1.5 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                    ← Anterior
                  </Link>
                ) : null}
                {eventsTotal > page * 25 ? (
                  <Link href={eventsHref({ days, action: actionFilter, step: stepFilter, page: page + 1 })} className="rounded-full border border-[#D9D2C2] px-4 py-1.5 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                    Seguinte →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function eventsHref({ days, action, step, page }: { days: number; action?: string; step?: number; page: number }): string {
  const qs = new URLSearchParams();
  if (days !== 30) qs.set("days", String(days));
  if (action) qs.set("action", action);
  if (step !== undefined) qs.set("step", String(step));
  if (page > 1) qs.set("page", String(page));
  const s = qs.toString();
  return `/dashboard/users/onboarding${s ? `?${s}` : ""}`;
}
