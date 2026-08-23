import Link from "next/link"
import { Suspense } from "react"
import { requireAuth } from "@/lib/auth"
import { SignOutButton } from "./sign-out-button"
import { WelcomeDialog } from "./welcome-dialog"
import { AdvancedLocationSettings } from "./advanced-location-settings"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  const session = await requireAuth()
  const user = session.user
  const params = searchParams ? await searchParams : {}
  const showWelcome = params.welcome === "1"

  let profileName: string | undefined
  let profileType: string | undefined
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

  // P0-1: single fetch para perfil pessoal — sem fallback para company
  try {
    const { apiFetch } = await import("@/lib/api")
    const res = await apiFetch<{ id: string; name: string; type: string } | null>("/api/v1/profiles/me", { cache: "no-store" })
    profileName = res.data?.name ?? undefined
    profileType = (res.data as { type?: string })?.type
    profileId = res.data?.id ?? null
    if (profileType === "company") {
      try {
        const qRes = await apiFetch<QualificationView | null>("/api/v1/company-qualification/me", { cache: "no-store" })
        qualification = qRes.data ?? null
      } catch {
        qualification = null
      }
    }
    if (profileId) {
      try {
        const locRes = await apiFetch<{ id: string; province: string; district: string | null; bairro: string | null; latitude: number | null; longitude: number | null; visibility: string; isPrimary: boolean }[]>(
          `/api/v1/profile-locations/${profileId}`,
          { cache: "no-store" }
        )
        locations = locRes.data ?? []
      } catch {}
    }
  } catch {
    profileName = undefined
  }

  // Personal dashboard não tem organizationId — mantém null explicitamente
  const orgId: string | null = null

  function AdvancedLocationSettingsWrapper({ profileName: _pn }: { profileName?: string }) {
    return <AdvancedLocationSettings profileId={profileId} organizationId={orgId} initial={locations} />
  }

  const sizeLabelMap: Record<string, string> = {
    micro: "Microempresa",
    pequena: "Pequena Empresa",
    media: "Média Empresa",
    grande: "Grande Empresa",
  }

  // --- derived state for the dashboard ---
  const hasProfile = !!profileName
  const hasQualification = !!qualification
  const hasLocation = locations.length > 0
  const hasVerifiedEmail = !!user?.emailVerified
  const exactCount = locations.filter((l) => l.visibility === "exact" && l.latitude != null).length

  const checklist = [
    { label: "Perfil criado", done: hasProfile, href: "/dashboard/profile/edit" },
    { label: "Qualificação IPEME", done: hasQualification, href: "/onboarding" },
    { label: "Localização activa", done: hasLocation, href: "#localizacoes" },
    { label: "Email verificado", done: hasVerifiedEmail, href: "#" },
  ]
  const doneCount = checklist.filter((c) => c.done).length
  const completeness = Math.round((doneCount / checklist.length) * 100)
  const nextIncomplete = checklist.find((c) => !c.done)

  const initials = (profileName ?? user?.name ?? "WD").slice(0, 2).toUpperCase()

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-5 pb-10">
      {showWelcome && <WelcomeDialog userName={user?.name ?? "utilizador"} profileName={profileName} />}

      {/* ── Masthead: identity + progress — asymmetrical, ledger-inspired ── */}
      <div className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white shadow-[0_8px_32px_rgba(15,26,46,0.07)]">
        {/* top ink bar */}
        <div className="flex items-center justify-between bg-[#0F1A2E] px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-white/70">
            <span className="hidden sm:inline-flex size-1.5 rounded-full bg-[#0B5E56] animate-pulse" aria-hidden />
            PAINEL OPERACIONAL
            <span className="hidden sm:inline text-white/20">·</span>
            <span className="hidden sm:inline font-mono text-[11px] font-medium tracking-normal text-white/50">
              {user?.email}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
              {profileType === "company" ? "Empresa" : profileType === "professional" ? "Profissional" : "Conta"}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${hasProfile ? "bg-[#0B5E56] text-white" : "bg-white/15 text-white/70"}`}
            >
              {hasProfile ? "Publicado" : "Rascunho"}
            </span>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          {/* left: identity */}
          <div className="relative p-5 sm:p-6">
            {/* subtle ledger grid */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative flex gap-4">
              {/* monogram block — signature element: carimbo perforado */}
              <div className="hidden sm:flex size-[64px] shrink-0 items-center justify-center rounded-[16px] border-[1.5px] border-dashed border-[#0B5E56]/30 bg-[#F6F3EE] text-[18px] font-black tracking-[-0.04em] text-[#0F1A2E] sm:size-[72px]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1
                    className="text-[22px] font-black leading-none tracking-[-0.03em] text-[#0F1A2E] sm:text-[26px]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {profileName ?? "Sem perfil nomeado"}
                  </h1>
                  {qualification && (
                    <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                      {sizeLabelMap[qualification.companySize] ?? qualification.companySize}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#0F1A2E]/60">
                  Bem-vindo de volta, <span className="font-semibold text-[#0F1A2E]">{user?.name}</span>.{" "}
                  <span className="hidden sm:inline">
                    Este é o teu centro de operações — visibilidade, proximidade e confiança num só lugar.
                  </span>
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-xs font-medium text-[#0F1A2E]">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden />
                    {user?.systemRole === "admin" ? "Administrador" : user?.systemRole === "moderator" ? "Moderador" : "Utilizador"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${hasVerifiedEmail ? "border-[#0B5E56]/20 bg-[#0B5E56]/10 text-[#0B5E56]" : "border-[#FF3B1F]/20 bg-[#FF3B1F]/10 text-[#7A1A0A]"}`}
                  >
                    {hasVerifiedEmail ? "✓ Email verificado" : "○ Email por verificar"}
                  </span>
                  {locations[0] && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-xs font-medium text-[#0F1A2E]/70">
                      📍 {locations[0].province}
                      {locations[0].district ? ` · ${locations[0].district}` : ""}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/profile/edit"
                    className="inline-flex h-8 items-center justify-center rounded-full bg-[#0F1A2E] px-4 text-xs font-bold text-white hover:bg-black"
                  >
                    Editar perfil
                  </Link>
                  <Link
                    href="/companies"
                    className="inline-flex h-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 text-xs font-semibold text-[#0F1A2E] hover:border-[#0F1A2E]"
                  >
                    Ver no directório
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* right: health meter */}
          <div className="border-t border-[#D9D2C2] bg-[#F6F3EE] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold tracking-[0.12em] text-[#0B5E56]">SAÚDE DO PERFIL</p>
              <span className="font-mono text-xs font-bold text-[#0F1A2E]/60">
                {doneCount}/{checklist.length}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span
                className="text-[42px] font-black leading-none tracking-[-0.05em] text-[#0F1A2E]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {completeness}
                <span className="text-[22px] font-light text-[#0B5E56]">%</span>
              </span>
              <span className="text-xs font-medium leading-relaxed text-[#0F1A2E]/60">
                {completeness === 100
                  ? "Perfil pronto para destaque."
                  : completeness >= 75
                    ? "Quase no topo das pesquisas."
                    : "Completa para ganhar visibilidade."}
              </span>
            </div>

            {/* meter — segmented ledger bar */}
            <div className="mt-3 flex gap-1.5">
              {checklist.map((c, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-colors ${c.done ? "bg-[#0B5E56]" : "bg-[#D9D2C2]"}`}
                  aria-hidden
                />
              ))}
            </div>

            <ul className="mt-3 grid gap-1.5">
              {checklist.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={`flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${c.done ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#D9D2C2] bg-white text-[#0F1A2E]/40"}`}
                    aria-hidden
                  >
                    {c.done ? "✓" : "·"}
                  </span>
                  <span className={c.done ? "font-medium text-[#0F1A2E]" : "text-[#0F1A2E]/60"}>{c.label}</span>
                  {!c.done && c.href !== "#" && (
                    <Link href={c.href} className="ml-auto text-[11px] font-bold text-[#0B5E56] hover:underline">
                      fazer →
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {nextIncomplete && (
              <div className="mt-3 rounded-xl border border-[#0B5E56]/15 bg-white px-3 py-2.5">
                <p className="text-xs font-bold text-[#0F1A2E]">Próximo: {nextIncomplete.label}</p>
                <p className="text-[11px] leading-relaxed text-[#0F1A2E]/60">
                  {nextIncomplete.label === "Localização activa"
                    ? "Adiciona a tua sede para aparecer em “Perto de mim”."
                    : nextIncomplete.label === "Qualificação IPEME"
                      ? "Define porte da empresa para selo e acesso a oportunidades."
                      : nextIncomplete.label === "Perfil criado"
                        ? "Dá nome e categoria ao teu perfil."
                        : "Confirma o email para selo de confiança."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI strip — 4 cards with distinct jobs, not identical grid ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Visibility */}
        <div className="relative overflow-hidden rounded-[18px] border border-[#D9D2C2] bg-white p-4">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">VISIBILIDADE</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${hasProfile ? "bg-[#0B5E56] text-white" : "bg-[#FF3B1F] text-white"}`}>
              {hasProfile ? "ACTIVO" : "INACTIVO"}
            </span>
          </div>
          <p className="mt-2 text-[13px] font-bold leading-tight text-[#0F1A2E]">
            {hasProfile ? "No directório público" : "Ainda não publicado"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
            {hasProfile ? "Apareces em pesquisas por categoria e localização." : "Completa o perfil para ser encontrado."}
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            <span className={`h-1 flex-1 rounded-full ${hasProfile ? "bg-[#0B5E56]" : "bg-[#D9D2C2]"}`} />
            <span className={`h-1 flex-1 rounded-full ${hasProfile && hasLocation ? "bg-[#0B5E56]" : "bg-[#D9D2C2]"}`} />
            <span className={`h-1 flex-1 rounded-full ${hasQualification ? "bg-[#0B5E56]" : "bg-[#D9D2C2]"}`} />
          </div>
        </div>

        {/* Proximity */}
        <div className="rounded-[18px] border border-[#D9D2C2] bg-[#0F1A2E] p-4 text-white">
          <p className="text-[11px] font-bold tracking-[0.1em] text-white/50">PROXIMIDADE</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] font-black leading-none tracking-[-0.04em]" style={{ fontFamily: "var(--font-display)" }}>
              {locations.length}
            </span>
            <span className="text-xs font-medium text-white/60">{locations.length === 1 ? "local registado" : "locais registados"}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80">
              {exactCount} com pin exacto
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80">
              {locations.length - exactCount} só zona
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
            Pesquisa “Perto de mim” usa PostGIS — pin exacto melhora ranking.
          </p>
        </div>

        {/* Selos */}
        <div className="rounded-[18px] border border-[#D9D2C2] bg-[#F6F3EE] p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">SELOS & CONFIANÇA</p>
          <div className="mt-3 flex items-center gap-2">
            {/* perforated stamp */}
            <div className="flex size-10 items-center justify-center rounded-[10px] border-2 border-dashed border-[#0B5E56]/30 bg-white text-xs font-black tracking-[0.08em] text-[#0B5E56]">
              {hasQualification ? "MPME" : "—"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-[#0F1A2E]">
                {qualification ? (sizeLabelMap[qualification.companySize] ?? qualification.companySize) : "Sem selo IPEME"}
              </p>
              <p className="text-xs text-[#0F1A2E]/55">
                {qualification ? `${qualification.workers} trabalhadores` : "Qualifica para desbloquear selo"}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span className={`size-2 rounded-full ${hasVerifiedEmail ? "bg-[#0B5E56]" : "bg-[#FF3B1F]"}`} aria-hidden />
            <span className={hasVerifiedEmail ? "font-medium text-[#0F1A2E]" : "text-[#0F1A2E]/60"}>
              {hasVerifiedEmail ? "Email verificado" : "Email por verificar"}
            </span>
            <span className="ml-auto size-2 rounded-full bg-[#D9D2C2]" aria-hidden />
            <span className="text-[#0F1A2E]/40">Verificação Workdeal em breve</span>
          </div>
        </div>

        {/* Pipeline */}
        <div className="rounded-[18px] border border-[#D9D2C2] bg-white p-4">
          <p className="text-[11px] font-bold tracking-[0.1em] text-[#0F1A2E]/50">OPORTUNIDADES</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#F6F3EE] px-2 py-2.5">
              <p className="font-mono text-sm font-bold text-[#0F1A2E]">—</p>
              <p className="text-[10px] font-semibold tracking-wide text-[#0F1A2E]/50">TAREFAS</p>
            </div>
            <div className="rounded-xl bg-[#F6F3EE] px-2 py-2.5">
              <p className="font-mono text-sm font-bold text-[#0F1A2E]">—</p>
              <p className="text-[10px] font-semibold tracking-wide text-[#0F1A2E]/50">EVENTOS</p>
            </div>
            <div className="rounded-xl border border-[#FF3B1F]/15 bg-[#FF3B1F]/5 px-2 py-2.5">
              <p className="font-mono text-sm font-bold text-[#7A1A0A]">—</p>
              <p className="text-[10px] font-semibold tracking-wide text-[#7A1A0A]/70">CONCURSOS</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#0F1A2E]/45">Feed ligado ao scraper e tarefas — em breve aqui.</p>
          <div className="mt-2 flex justify-center gap-2">
            <Link href="/companies" className="text-xs font-bold text-[#0B5E56] hover:underline">
              Explorar empresas →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main workspace: qualification + locations ── */}
      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        {/* Qualification */}
        <div className="flex flex-col rounded-[20px] border border-[#D9D2C2] bg-white p-5 shadow-[0_8px_24px_rgba(15,26,46,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
              Qualificação IPEME
            </h2>
            {qualification ? (
              <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[11px] font-bold text-white">
                {sizeLabelMap[qualification.companySize] ?? qualification.companySize}
              </span>
            ) : (
              <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/60">
                Pendente
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-[#0F1A2E]/55">
            Classificação oficial por trabalhadores e volume de negócios. Define selo, taxas e oportunidades adequadas ao porte.
          </p>

          {profileType === "company" && qualification ? (
            <>
              {/* ledger table */}
              <div className="mt-4 divide-y divide-[#D9D2C2]/60 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE]/60">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs font-semibold tracking-wide text-[#0F1A2E]/60">PORTE</span>
                  <span className="rounded-full bg-[#0B5E56] px-2.5 py-1 text-xs font-bold text-white">
                    {sizeLabelMap[qualification.companySize] ?? qualification.companySize}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-[#0F1A2E]/60">Trabalhadores</span>
                  <span className="font-mono text-sm font-bold text-[#0F1A2E]">{qualification.workers}</span>
                </div>
                {qualification.turnoverMzn != null && (
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <span className="text-xs text-[#0F1A2E]/60">Volume anual</span>
                    <span className="font-mono text-sm font-semibold text-[#0F1A2E]">
                      {qualification.turnoverMzn.toLocaleString("pt-MZ")} MZN
                    </span>
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
              <div className="mt-3 flex gap-2">
                <Link
                  href="/onboarding"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-semibold text-[#0F1A2E] hover:border-[#0F1A2E]"
                >
                  Actualizar dados
                </Link>
                <Link
                  href="/dashboard/profile"
                  className="inline-flex items-center justify-center rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white hover:bg-black"
                >
                  Ver perfil
                </Link>
              </div>
            </>
          ) : profileType === "company" ? (
            <div className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <p className="text-sm font-bold text-[#0F1A2E]">Completa a qualificação</p>
              <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
                Adiciona nº de trabalhadores, volume de negócios e NUIT para obter o selo MPME/Grande e desbloquear oportunidades adequadas ao porte.
              </p>
              <Link
                href="/onboarding"
                className="mt-3 inline-flex rounded-full bg-[#FF3B1F] px-4 py-2 text-xs font-bold text-white hover:bg-[#E8350F]"
              >
                Qualificar empresa →
              </Link>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <p className="text-sm font-bold text-[#0F1A2E]">Perfil profissional</p>
              <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
                Como profissional, o teu destaque vem de portfólio, avaliações e proximidade — mantém localização actualizada e pede avaliações a clientes.
              </p>
              <Link
                href="/dashboard/profile/edit"
                className="mt-3 inline-flex rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white hover:bg-black"
              >
                Completar perfil →
              </Link>
            </div>
          )}
        </div>

        {/* Locations — P1-7 Suspense streaming (AGENTS §2.4) */}
        <div id="localizacoes" className="min-w-0">
          <Suspense fallback={<div className="animate-pulse rounded-[20px] border border-[#D9D2C2] bg-white p-5"><div className="h-6 w-40 rounded bg-[#F6F3EE]" /></div>}>
            <AdvancedLocationSettingsWrapper profileName={profileName} />
          </Suspense>
        </div>
      </div>

      {/* ── Shortcuts — structural, not decorative ── */}
      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Atalhos operacionais
          </h2>
          <span className="text-xs text-[#0F1A2E]/45">Tudo o que precisas a um clique — sem sair do painel.</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/dashboard/profile/edit"
            className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 hover:border-[#0B5E56]/30 hover:bg-white"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0F1A2E] text-white">◈</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Editar perfil</span>
              <span className="block text-xs text-[#0F1A2E]/55">Logo, bio, contactos</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#0B5E56] text-white">◎</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Ver perfil público</span>
              <span className="block text-xs text-[#0F1A2E]/55">Como clientes te vêem</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
          <Link
            href="/companies"
            className="group flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 hover:border-[#0F1A2E]/20"
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]">✦</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight text-[#0F1A2E]">Explorar directório</span>
              <span className="block text-xs text-[#0F1A2E]/55">Ver concorrência local</span>
            </span>
            <span className="ml-auto text-[#0F1A2E]/30 group-hover:text-[#0B5E56]">→</span>
          </Link>
        </div>
      </div>

      {/* ── Account ledger — compact, not settings-page dominant ── */}
      <div className="flex flex-col gap-3 rounded-[16px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-[#0F1A2E]">Sessão</p>
          <p className="truncate font-mono text-xs text-[#0F1A2E]/60">{user?.email} · {user?.systemRole}</p>
        </div>
        <div className="shrink-0">
          <SignOutButton />
        </div>
      </div>
    </div>
  )
}
