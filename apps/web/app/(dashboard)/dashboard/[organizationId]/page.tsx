import Link from "next/link"
import type { ReactNode } from "react"
import { FiLock } from "react-icons/fi"
import { MapPin, Pencil, FolderKanban, Store, ListChecks, Briefcase, CalendarDays, ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { SignOutButton } from "../sign-out-button"
import { AdvancedLocationSettings } from "../advanced-location-settings"
import { VisitsTimeChart, OriginsChart, SizeChart, ProvinceBars, VisitorsTable } from "@/components/features/org-analytics"
import { getFeatureAccess } from "@/lib/features"
import { AiAssistantPanel } from "@/components/features/ai-assistant-panel"
import { AiResponseDraft } from "@/components/features/ai-response-draft"

function LockedOverlay({ unlockHref, compact = false }: { unlockHref: string; compact?: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className={`w-full ${compact ? "max-w-[230px]" : "max-w-[340px]"} rounded-[18px] border border-white/15 bg-[#0F1A2E] ${compact ? "px-4 py-3" : "px-6 py-5"} text-center shadow-[0_16px_48px_rgba(15,26,46,0.35)]`}>
        <span className={`mx-auto flex items-center justify-center rounded-full bg-[#0B5E56] text-white ${compact ? "size-8" : "size-10"}`}>
          <FiLock className={compact ? "size-4" : "size-5"} aria-hidden />
        </span>
        <p className={`mt-2 font-black tracking-tight text-white ${compact ? "text-[13px]" : "text-[15px]"}`}>Analytics Premium</p>
        {!compact && (
          <p className="mt-1 text-xs leading-relaxed text-white/65">Vê quem visita o teu perfil, de onde vem e o que faz a seguir.</p>
        )}
        <Link
          href={unlockHref}
          className={`mt-3 inline-flex items-center justify-center rounded-full bg-[#0B5E56] font-bold text-white transition-colors hover:bg-[#094d46] ${compact ? "h-8 px-4 text-xs" : "h-10 px-5 text-sm"}`}
        >
          Desbloquear Analytics
        </Link>
      </div>
    </div>
  )
}

// Secção analítica com gate premium: bloqueada → chamariz desfocado (sem
// dados reais no DOM, pois o fetch é saltado) + CTA; desbloqueada → conteúdo.
function AnalyticsZone({
  locked,
  unlockHref,
  overlay,
  className,
  children,
}: {
  locked: boolean
  unlockHref: string
  overlay?: "compact"
  className?: string
  children: ReactNode
}) {
  if (!locked) return <>{children}</>
  return (
    <div className={`relative ${className ?? ""}`}>
      <div aria-hidden className="pointer-events-none select-none blur-[6px]">
        {children}
      </div>
      <LockedOverlay unlockHref={unlockHref} compact={overlay === "compact"} />
    </div>
  )
}

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard/personal")

  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()

  let orgName: string | undefined
  let orgSlug: string | undefined
  let orgVerified = false
  let profileName: string | undefined
  let profileSlug: string | undefined
  let profileId: string | null = null
  let isProfilePublished = false
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

  // Resolução directa por organização — o slug do perfil pode divergir do
  // slug da organização (rename, pré-registo, sufixo de unicidade).
  try {
    const { apiFetch } = await import("@/lib/api")
    const pRes = await apiFetch<{ id: string; name: string; slug: string; status: string } | null>(`/api/v1/profiles/by-organization/${organizationId}`, { cache: "no-store" })
    const pData = pRes.data
    if (pData?.id) {
      profileName = pData.name
      profileSlug = pData.slug
      profileId = pData.id
      isProfilePublished = pData.status === "active"
    }
  } catch {}

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

  const featureAccess = await getFeatureAccess(organizationId)
  const aiAssistant = featureAccess.get("ai_assistant")?.accessible ?? false
  const aiResponseDraft = featureAccess.get("ai_response_support")?.accessible ?? false
  // Analytics é premium: sem acesso, a API responderia 403 e os zeros do
  // fallback fingiriam "sem tráfego" — em vez disso, secções desfocadas com CTA.
  const analyticsLocked =
    !featureAccess.get("analytics_visits_contacts")?.accessible && !featureAccess.get("analytics_advanced")?.accessible
  const unlockHref = `/dashboard/${organizationId}/subscription`

  // Fetch real analytics from API (saltado quando bloqueado: sem dados reais no HTML)
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
  if (profileId && !analyticsLocked) {
    try {
      const { apiFetch } = await import("@/lib/api")
      const aRes = await apiFetch<AnalyticsData>(`/api/v1/analytics/${profileId}/dashboard`, { cache: "no-store" })
      analytics = aRes.data ?? null
    } catch {}
  }

  // Fallback: zeros quando não há perfil nem dados — e chamariz desfocado quando bloqueado
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
      {/* ── Org header — quiet card, mesma linguagem do sidebar ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Painel da organização · <span className="font-mono normal-case">/{orgSlug ?? organizationId.slice(0, 8)}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize text-muted-foreground">{role}</span>
              {orgVerified ? (
                <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">Verificada</span>
              ) : (
                <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Verificação pendente</span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex gap-4">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground sm:flex" aria-hidden>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{orgName ?? profileName ?? "Empresa"}</CardTitle>
                {qualification && (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                    {sizeLabelMap[qualification.companySize] ?? qualification.companySize}
                  </span>
                )}
              </div>
              <CardDescription className="mt-1">
                {profileName ? `Perfil público: ${profileName}` : "Sem perfil público ainda"} · {locations.length} {locations.length === 1 ? "local" : "locais"} ·{" "}
                {qualification ? `${qualification.workers} colaboradores` : "qualificação pendente"}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {hasLocation ? `${locations[0]!.province}${locations[0]!.district ? ` · ${locations[0]!.district}` : ""}` : "Sem localização — adiciona para “Perto de mim”"}
                </span>
                {qualification?.nuit && (
                  <span className="inline-flex rounded-full border px-2.5 py-1 font-mono text-xs text-muted-foreground">NUIT {qualification.nuit}</span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button render={<Link href={`/dashboard/${organizationId}/profile/edit`} />}>
                  Editar perfil da empresa
                </Button>
                <Button variant="outline" render={<Link href={profileSlug ? `/profiles/${profileSlug}` : orgSlug ? `/profiles/${orgSlug}` : "/companies"} />}>
                  Ver no directório
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* visits summary — vault (desfocado com CTA quando premium bloqueado) */}
      <AnalyticsZone locked={analyticsLocked} unlockHref={unlockHref}>
        <Card>
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visitas · últimos 30 dias</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-heading text-4xl font-semibold tracking-tight">
                {analytics.total30}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-muted-foreground">
                {analytics.growth >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                {analytics.growth >= 0 ? `+${analytics.growth}%` : `${analytics.growth}%`} vs 30d ant.
              </span>
            </div>
            <CardDescription>
              {analytics.unicos30} visitantes únicos · média {(analytics.total30 / 30).toFixed(1)}/dia · pico {Math.max(...analytics.days.slice(-30).map((d) => d.visitas))} visitas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-8 items-end gap-[2px]">
              {analytics.days.slice(-30).map((d) => (
                <div key={d.date} className="flex-1 rounded-sm bg-primary" style={{ height: `${Math.max(12, (d.visitas / 38) * 100)}%`, opacity: 0.18 + (d.visitas / 38) * 0.82 }} title={`${d.label}: ${d.visitas}`} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted px-2 py-2">
                <p className="font-mono text-sm font-semibold">{analytics.unicos30}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Únicos</p>
              </div>
              <div className="rounded-lg bg-muted px-2 py-2">
                <p className="font-mono text-sm font-semibold">{Math.round((analytics.unicos30 / Math.max(1, analytics.total30)) * 100)}%</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Retorno</p>
              </div>
              <div className="rounded-lg bg-muted px-2 py-2">
                <p className="font-mono text-sm font-semibold">{analytics.quotesCount}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Acções</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AnalyticsZone>

      {/* ── KPI strip org — 4 cards idênticos ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card size="sm">
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visibilidade</p>
            <CardTitle className="text-sm">{isProfilePublished ? "Publicada no directório" : "Rascunho — não listada"}</CardTitle>
            <CardDescription>{isProfilePublished ? "Aparece em pesquisas e mapa." : "Completa perfil para ser encontrada."}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="bg-primary" style={{ width: isProfilePublished ? "92%" : "18%" }} />
            </div>
          </CardContent>
        </Card>
        <AnalyticsZone locked={analyticsLocked} unlockHref={unlockHref} overlay="compact">
          <Card size="sm">
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Performance</p>
              <CardTitle className="font-heading text-2xl font-semibold tracking-tight">
                {Math.round((analytics.unicos30 / Math.max(1, analytics.total30)) * 100)}%
              </CardTitle>
              <CardDescription>Taxa de visitantes únicos — visitantes que voltam para contactar.</CardDescription>
            </CardHeader>
          </Card>
        </AnalyticsZone>
        <AnalyticsZone locked={analyticsLocked} unlockHref={unlockHref} overlay="compact">
          <Card size="sm">
            <CardHeader>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conversão {analytics.realQuotesCount > 0 ? "real" : "est."}</p>
              <CardTitle className="text-sm">
                {analytics.realQuotesCount > 0
                  ? `${analytics.realQuotesCount} cotações / 30d (real)`
                  : `${analytics.quotesCount} contactos / 30d`}
              </CardTitle>
              <CardDescription>
                {analytics.realQuotesCount > 0 ? "Cotações via /api/v1/quotes" : "Cliques em WhatsApp/telefone/email"}
              </CardDescription>
            </CardHeader>
          </Card>
        </AnalyticsZone>
        <Card size="sm">
          <CardHeader>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Território</p>
            <CardTitle className="text-sm">{locations.length} sede(s) activas</CardTitle>
            <CardDescription>
              {locations.filter((l) => l.visibility === "exact" && l.latitude).length} com pin exacto · PostGIS ranking activo
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* ── Analytics premium — desfocado com CTA quando bloqueado ── */}
      <AnalyticsZone locked={analyticsLocked} unlockHref={unlockHref} className="space-y-4">
      <VisitsTimeChart days={analytics.days} />

      {/* ── Secondary charts — distinct treatments ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <OriginsChart data={analytics.origins} />
        <SizeChart data={analytics.sizes} />
        <ProvinceBars data={analytics.provinces} />
      </div>

      <VisitorsTable rows={analytics.visitors} />
      </AnalyticsZone>

      {/* ── Visitors caption — nunca finge "sem tráfego" quando bloqueado ── */}
      {analyticsLocked ? (
        <p className="text-xs text-[#0F1A2E]/40">Detalhe de visitas, origens e visitantes disponível no plano Analytics.</p>
      ) : (
        <p className="text-xs text-[#0F1A2E]/40">
          {analytics.total30 > 0
            ? `${analytics.total30} visitas nos últimos 30d · ${analytics.unicos30} visitantes únicos.`
            : "Sem visitas registadas ainda — os dados aparecem quando utilizadores visitarem o vosso perfil."}
        </p>
      )}

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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">Atalhos da organização</CardTitle>
            <CardDescription>Operação diária sem sair do painel.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { href: `/dashboard/${organizationId}/profile/edit`, icon: Pencil, title: "Editar perfil", desc: "Logo, bio, contactos" },
              { href: `/dashboard/${organizationId}/profile`, icon: FolderKanban, title: "Portfólio", desc: "Obras e casos" },
              { href: "/companies", icon: Store, title: "Concorrência", desc: "Ver vizinhos no mapa" },
              { href: `/dashboard/${organizationId}/tasks`, icon: ListChecks, title: "Tarefas", desc: "Publicar e gerir propostas" },
              { href: `/dashboard/${organizationId}/opportunities`, icon: Briefcase, title: "Oportunidades", desc: "Propostas e adjudicações" },
              { href: `/dashboard/${organizationId}/events`, icon: CalendarDays, title: "Eventos", desc: "Criar e fazer check-in" },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="group flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium leading-tight">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.desc}</span>
                </span>
                <ArrowRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {aiAssistant && (
        <AiAssistantPanel organizationId={organizationId} />
      )}

      {aiResponseDraft && (
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#0F1A2E] text-white">✉</span>
              <div>
                <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                  Respostas com IA
                </h2>
                <p className="text-[11px] text-[#0F1A2E]/50">Rascunhos de resposta a pedidos de orçamento e contactos.</p>
              </div>
            </div>
            <AiResponseDraft
              organizationId={organizationId}
              trigger={
                <button className="inline-flex h-9 items-center justify-center rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black transition-colors">
                  Gerar resposta
                </button>
              }
            />
          </div>
        </div>
      )}

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
