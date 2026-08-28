import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { SignOutButton } from "../sign-out-button"
import { AdvancedLocationSettings } from "../advanced-location-settings"
import { VisitsTimeChart, OriginsChart, SizeChart, ProvinceBars, VisitorsTable } from "@/components/features/org-analytics"

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard")

  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()

  let orgName: string | undefined
  let orgSlug: string | undefined
  let orgVerified = false
  let profileName: string | undefined
  let profileId: string | null = null
  type QualificationView = {
    companySize: string
    workers: number
    turnoverMzn: number | null
    legalForm: string | null
    nuit: string | null
  }
  let qualification: QualificationView | null = null
  let locations: { id: string; province: string; district: string | null; bairro: string | null; latitude: number | null; longitude: number | null; visibility: string; isPrimary: boolean }[] = []

  try {
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    const org = orgs.find((o) => o.id === organizationId)
    orgName = org?.name
    orgSlug = org?.slug
    orgVerified = org?.verificationStatus === "verified"
  } catch {}

  try {
    if (orgSlug) {
      const { apiFetch } = await import("@/lib/api")
      const pRes = await apiFetch<{ id: string; name: string; slug: string } | null>(`/api/v1/profiles/${orgSlug}`, { cache: "no-store" })
      const pData = pRes.data
      if (pData?.id) {
        profileName = pData.name
        profileId = pData.id
      }
    }
  } catch {}
  if (!profileId && orgSlug) {
    try {
      const { apiFetch } = await import("@/lib/api")
      const listRes = await apiFetch<{ items: { id: string; name: string; slug: string }[] }>("/api/v1/profiles?limit=50", { cache: "no-store" })
      const items = listRes.data?.items ?? []
      const found = items.find((it) => it.slug === orgSlug)
      if (found) {
        profileName = found.name
        profileId = found.id
      }
    } catch {}
  }

  try {
    const { apiFetch } = await import("@/lib/api")
    const qRes = await apiFetch<QualificationView | null>(`/api/v1/company-qualification/${organizationId}`, { cache: "no-store" })
    qualification = qRes.data ?? null
    if (!qualification) {
      const alt = await apiFetch<QualificationView | null>("/api/v1/company-qualification/me", { cache: "no-store" })
      const altData = alt.data
      if (altData) qualification = altData
    }
  } catch {
    qualification = null
  }

  if (profileId) {
    try {
      const { apiFetch } = await import("@/lib/api")
      const locRes = await apiFetch<typeof locations>(`/api/v1/profile-locations/${profileId}`, { cache: "no-store" })
      locations = locRes.data ?? []
    } catch {}
  }

  const sizeLabelMap: Record<string, string> = {
    micro: "Microempresa",
    pequena: "Pequena Empresa",
    media: "Média Empresa",
    grande: "Grande Empresa",
  }

  // Fetch real analytics from API
  type AnalyticsData = {
    days: { date: string; label: string; visitas: number; unicos: number }[]
    origins: { origin: string; value: number; fill: string }[]
    sizes: { size: string; value: number; fill: string }[]
    provinces: { province: string; value: number }[]
    visitors: { id: string; name: string; company: string; size: string; origin: string; province: string; action: string; time: string; avatar: string }[]
    total30: number
    unicos30: number
    growth: number
    realQuotesCount: number
    quotesCount: number
  }
  let analytics: AnalyticsData | null = null
  if (profileId) {
    try {
      const { apiFetch } = await import("@/lib/api")
      const aRes = await apiFetch<AnalyticsData>(`/api/v1/analytics/${profileId}/dashboard`, { cache: "no-store" })
      analytics = aRes.data ?? null
    } catch {}
  }

  // Fallback: empty analytics when no profile or no data yet
  if (!analytics) {
    const emptyDays = Array.from({ length: 90 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (89 - i))
      return { date: d.toISOString().slice(0, 10), label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, visitas: 0, unicos: 0 }
    })
    analytics = {
      days: emptyDays,
      origins: [],
      sizes: [
        { size: "Micro", value: 0, fill: "#0F1A2E" },
        { size: "Pequena", value: 0, fill: "#0B5E56" },
        { size: "Média", value: 0, fill: "#4A6B7C" },
        { size: "Grande", value: 0, fill: "#FF3B1F" },
      ],
      provinces: [],
      visitors: [],
      total30: 0,
      unicos30: 0,
      growth: 0,
      realQuotesCount: 0,
      quotesCount: 0,
    }
  }

  const initials = (orgName ?? profileName ?? "EM").slice(0, 2).toUpperCase()
  const hasLocation = locations.length > 0

  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-5 pb-10">
      {/* ── Masthead — manifesto da organização ── */}
      <div className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white shadow-[0_8px_32px_rgba(15,26,46,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0F1A2E] px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-white/60">
            <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" aria-hidden />
            PAINEL DA ORGANIZAÇÃO
            <span className="hidden sm:inline text-white/20">·</span>
            <span className="hidden sm:inline font-mono text-[11px] font-medium tracking-normal text-white/45">/{orgSlug ?? organizationId.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-white/80">{role}</span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${orgVerified ? "bg-[#0B5E56] text-white" : "bg-white/15 text-white/70"}`}>
              {orgVerified ? "✓ Verificada" : "Verificação pendente"}
            </span>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative p-5 sm:p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative flex gap-4">
              <div className="hidden sm:flex size-[72px] shrink-0 items-center justify-center rounded-[16px] border-[1.5px] border-dashed border-[#0B5E56]/30 bg-[#F6F3EE] text-[18px] font-black tracking-[-0.04em] text-[#0F1A2E]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-[22px] font-black leading-none tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
                    {orgName ?? profileName ?? "Empresa"}
                  </h1>
                  {qualification && (
                    <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white">
                      {sizeLabelMap[qualification.companySize] ?? qualification.companySize}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#0F1A2E]/60">
                  {profileName ? `Perfil público: ${profileName}` : "Sem perfil público ainda"} · {locations.length} {locations.length === 1 ? "local" : "locais"} ·{" "}
                  {qualification ? `${qualification.workers} colaboradores` : "qualificação pendente"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-xs font-medium text-[#0F1A2E]/70">
                    {hasLocation ? `📍 ${locations[0]!.province}${locations[0]!.district ? ` · ${locations[0]!.district}` : ""}` : "Sem localização — adiciona para “Perto de mim”"}
                  </span>
                  {qualification?.nuit && (
                    <span className="inline-flex rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 font-mono text-xs font-semibold text-[#0F1A2E]/70">NUIT {qualification.nuit}</span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/dashboard/${organizationId}/profile/edit`} className="inline-flex h-8 items-center justify-center rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black">
                    Editar perfil da empresa
                  </Link>
                  <Link
                    href={orgSlug ? `/profiles/${orgSlug}` : "/companies"}
                    className="inline-flex h-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 text-xs font-semibold text-[#0F1A2E] hover:border-[#0F1A2E]"
                  >
                    Ver no directório
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* visits summary — vault */}
          <div className="border-t border-[#D9D2C2] bg-[#F6F3EE] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">VISITAS · ÚLTIMOS 30 DIAS</p>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-[42px] font-black leading-none tracking-[-0.05em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                {analytics.total30}
              </span>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${analytics.growth >= 0 ? "bg-[#0B5E56] text-white" : "bg-[#FF3B1F] text-white"}`}>
                {analytics.growth >= 0 ? `↗ +${analytics.growth}%` : `↘ ${analytics.growth}%`} vs 30d ant.
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
              {analytics.unicos30} visitantes únicos · média {(analytics.total30 / 30).toFixed(1)}/dia · pico {Math.max(...analytics.days.slice(-30).map((d) => d.visitas))} visitas
            </p>
            {/* mini ledger ticks — 30 tiny bars */}
            <div className="mt-3 flex items-end gap-[2px] h-8">
              {analytics.days.slice(-30).map((d) => (
                <div key={d.date} className="flex-1 rounded-sm bg-[#0B5E56]" style={{ height: `${Math.max(12, (d.visitas / 38) * 100)}%`, opacity: 0.18 + (d.visitas / 38) * 0.82 }} title={`${d.label}: ${d.visitas}`} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white px-2 py-2 border border-[#D9D2C2]">
                <p className="font-mono text-sm font-bold text-[#0F1A2E]">{analytics.unicos30}</p>
                <p className="text-[10px] font-bold tracking-wide text-[#0F1A2E]/50">ÚNICOS</p>
              </div>
              <div className="rounded-xl bg-white px-2 py-2 border border-[#D9D2C2]">
                <p className="font-mono text-sm font-bold text-[#0F1A2E]">{Math.round((analytics.unicos30 / Math.max(1, analytics.total30)) * 100)}%</p>
                <p className="text-[10px] font-bold tracking-wide text-[#0F1A2E]/50">RETORNO</p>
              </div>
              <div className="rounded-xl bg-[#0F1A2E] px-2 py-2">
                <p className="font-mono text-sm font-bold text-white">{analytics.quotesCount}</p>
                <p className="text-[10px] font-bold tracking-wide text-white/60">ACÇÕES</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip org ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">VISIBILIDADE</p>
          <p className="mt-2 text-sm font-bold text-[#0F1A2E]">{profileName ? "Publicada no directório" : "Rascunho — não listada"}</p>
          <p className="mt-1 text-xs text-[#0F1A2E]/55">{profileName ? "Aparece em pesquisas e mapa." : "Completa perfil para ser encontrada."}</p>
          <div className="mt-3 h-1.5 rounded-full bg-[#F6F3EE] overflow-hidden flex">
            <div className="bg-[#0B5E56]" style={{ width: profileName ? "92%" : "18%" }} />
          </div>
        </div>
        <div className="rounded-[18px] border border-[#D9D2C2] bg-[#0F1A2E] p-4 text-white">
          <p className="text-[11px] font-bold tracking-[0.1em] text-white/50">PERFORMANCE</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[26px] font-black leading-none" style={{ fontFamily: "var(--font-display)" }}>
              {Math.round((analytics.unicos30 / Math.max(1, analytics.total30)) * 100)}%
            </span>
            <span className="text-xs text-white/60">taxa visitantes únicos</span>
          </div>
          <p className="mt-1 text-xs text-white/50">Visitantes que voltam para contactar.</p>
        </div>
        <div className="rounded-[18px] border border-[#D9D2C2] bg-[#F6F3EE] p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">CONVERSÃO {analytics.realQuotesCount > 0 ? "REAL" : "EST."}</p>
          <p className="mt-2 text-sm font-bold text-[#0F1A2E]">
            {analytics.realQuotesCount > 0
              ? `${analytics.realQuotesCount} cotações / 30d (real)`
              : `${analytics.quotesCount} contactos / 30d`}
          </p>
          <p className="mt-1 text-xs text-[#0F1A2E]/55">
            {analytics.realQuotesCount > 0 ? "Cotações via /api/v1/quotes" : "Cliques em WhatsApp/telefone/email"}
          </p>
        </div>
        <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">TERRITÓRIO</p>
          <p className="mt-2 text-sm font-bold text-[#0F1A2E]">{locations.length} sede(s) activas</p>
          <p className="mt-1 text-xs text-[#0F1A2E]/55">
            {locations.filter((l) => l.visibility === "exact" && l.latitude).length} com pin exacto · PostGIS ranking activo
          </p>
        </div>
      </div>

      {/* ── Main chart ── */}
      <VisitsTimeChart days={analytics.days} />

      {/* ── Secondary charts — distinct treatments ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OriginsChart data={analytics.origins} />
        <SizeChart data={analytics.sizes} />
        <ProvinceBars data={analytics.provinces} />
      </div>

      {/* ── Visitors table — real analytics data */}
      <p className="text-xs text-[#0F1A2E]/40">
        {analytics.total30 > 0
          ? `${analytics.total30} visitas nos últimos 30d · ${analytics.unicos30} visitantes únicos.`
          : "Sem visitas registadas ainda — os dados aparecem quando utilizadores visitarem o vosso perfil."}
      </p>
      <VisitorsTable rows={analytics.visitors} />

      {/* ── Operations row — qualification + locations + shortcuts ── */}
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Qualificação IPEME
            </h2>
            {qualification ? (
              <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white">{sizeLabelMap[qualification.companySize] ?? qualification.companySize}</span>
            ) : (
              <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/60">Pendente</span>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#0F1A2E]/55">Define selo, taxas internas e elegibilidade para oportunidades por porte.</p>
          {qualification ? (
            <div className="mt-4 divide-y divide-[#D9D2C2]/60 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE]/60">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs font-semibold tracking-wide text-[#0F1A2E]/60">PORTE</span>
                <span className="rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-bold text-white">{sizeLabelMap[qualification.companySize] ?? qualification.companySize}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-xs text-[#0F1A2E]/60">Trabalhadores</span>
                <span className="font-mono text-sm font-bold text-[#0F1A2E]">{qualification.workers}</span>
              </div>
              {qualification.turnoverMzn != null && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-[#0F1A2E]/60">Volume anual</span>
                  <span className="font-mono text-sm font-semibold text-[#0F1A2E]">{qualification.turnoverMzn.toLocaleString("pt-MZ")} MZN</span>
                </div>
              )}
              {qualification.legalForm && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-[#0F1A2E]/60">Forma jurídica</span>
                  <span className="text-sm font-medium capitalize text-[#0F1A2E]">{qualification.legalForm}</span>
                </div>
              )}
              {qualification.nuit && (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-[#0F1A2E]/60">NUIT</span>
                  <span className="font-mono text-xs font-semibold tracking-wide text-[#0F1A2E]">{qualification.nuit}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <p className="text-sm font-bold text-[#0F1A2E]">Qualifica a empresa</p>
              <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">Adiciona trabalhadores, volume e NUIT para desbloquear selo e cálculo de taxas correcto.</p>
              <Link href={`/dashboard/${organizationId}/profile/edit`} className="mt-3 inline-flex rounded-full bg-[#FF3B1F] px-4 py-2 text-xs font-bold text-white hover:bg-[#E8350F]">
                Qualificar agora →
              </Link>
            </div>
          )}
        </div>

        <div className="min-w-0">
          {profileId ? (
            <AdvancedLocationSettings profileId={profileId} organizationId={organizationId} initial={locations} />
          ) : (
            <div className="rounded-[20px] border border-dashed border-[#D9D2C2] bg-white p-6 text-sm text-[#0F1A2E]/60">
              Cria o perfil da empresa para gerir localizações e aparecer em “Perto de mim”.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Atalhos da organização
          </h2>
          <span className="text-xs text-[#0F1A2E]/45">Operação diária sem sair do painel.</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link href={`/dashboard/${organizationId}/profile/edit`} className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 hover:border-[#0B5E56]/30 hover:bg-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0F1A2E] text-white">◈</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Editar perfil</span>
              <span className="block text-xs text-[#0F1A2E]/55">Logo, bio, contactos</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link href={`/dashboard/${organizationId}/profile`} className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-white">◎</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Portfólio</span>
              <span className="block text-xs text-[#0F1A2E]/55">Obras e casos</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link href="/companies" className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20">
            <span className="flex size-9 items-center justify-center rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]">✦</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Concorrência</span>
              <span className="block text-xs text-[#0F1A2E]/55">Ver vizinhos no mapa</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link href={`/dashboard/${organizationId}/tasks`} className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 hover:border-[#0B5E56]/30 hover:bg-white">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0F1A2E] text-white">▤</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Tarefas</span>
              <span className="block text-xs text-[#0F1A2E]/55">Publicar e gerir propostas</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link href={`/dashboard/${organizationId}/opportunities`} className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-white">⬡</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Oportunidades</span>
              <span className="block text-xs text-[#0F1A2E]/55">Propostas e adjudicações</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link href={`/dashboard/${organizationId}/events`} className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20">
            <span className="flex size-9 items-center justify-center rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]">◷</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Eventos</span>
              <span className="block text-xs text-[#0F1A2E]/55">Criar e fazer check-in</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-[#0F1A2E]">Sessão activa</p>
          <p className="truncate font-mono text-xs text-[#0F1A2E]/60">
            {orgName ?? organizationId} · papel {role} · {session.user.email}
          </p>
        </div>
        <div className="shrink-0">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
