import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { hasOrgPermission } from "@workdeal/shared"

export default async function CompanySettingsPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard/profile/edit")

  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()

  const { listUserOrganizations } = await import("@workdeal/auth/repository")
  const orgs = await listUserOrganizations(session.user.id)
  const org = orgs.find((o) => o.id === organizationId)
  if (!org) notFound()

  const canEdit = hasOrgPermission(role, "profile:edit")
  const canManageMembers = hasOrgPermission(role, "members:manage")

  // Busca perfil para mostrar foto actual
  let profile: { id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null } | null = null
  try {
    const { apiFetch } = await import("@/lib/api")
    const res = await apiFetch<{ id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null } | null>(
      `/api/v1/profiles/${encodeURIComponent(org.slug)}`,
      { cache: "no-store" },
    )
    profile = res.data ?? null
  } catch {}

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-5 pb-10">
      <div className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">DEFINIÇÕES · {org.name}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Definições da empresa
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Papel: <span className="font-bold capitalize text-[#0F1A2E]">{role}</span> · {canEdit ? "Podes actualizar foto e dados." : "Só visualização — pede a um admin para editar."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <h2 className="text-sm font-black text-[#0F1A2E]">Foto de perfil</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
            Logótipo quadrado 512×512, PNG/JPG/WebP até 5 MB. Aparece no directório, selos e partilhas.
          </p>
          <div className="mt-4">
            {/* Re-usa o mesmo fluxo de upload do editar perfil — sem duplicar lógica */}
            <SettingsPhotoCard profile={profile} organizationId={organizationId} canEdit={canEdit} />
          </div>
          {!canEdit && <p className="mt-3 text-xs font-medium text-[#7A1A0A]">Sem permissão `profile:edit` — contacta um `admin`/`owner`.</p>}
        </div>

        <div className="rounded-[20px] border border-[#D9D2C2] bg-[#F6F3EE] p-5">
          <h2 className="text-sm font-black text-[#0F1A2E]">Atalhos</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`/dashboard/${organizationId}/profile/edit`} className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
                Editar perfil completo →
              </a>
              <span className="ml-2 text-xs text-[#0F1A2E]/50">nome, tagline, descrição, categorias, qualificação</span>
            </li>
            <li>
              <a href={`/dashboard/${organizationId}/verification`} className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
                Verificação →
              </a>
              <span className="ml-2 text-xs text-[#0F1A2E]/50">selo Verificada, NUIT/alvará</span>
            </li>
            <li>
              <a href={`/dashboard/${organizationId}/team`} className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
                Equipa →
              </a>
              <span className="ml-2 text-xs text-[#0F1A2E]/50">{canManageMembers ? "convidar e gerir papéis" : "ver membros"}</span>
            </li>
            {profile?.slug && (
              <li>
                <a href={`/profiles/${profile.slug}`} className="font-semibold text-[#0F1A2E] underline decoration-[#D9D2C2] underline-offset-4 hover:text-[#0B5E56]">
                  Ver perfil público →
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <h2 className="text-sm font-black text-[#0F1A2E]">Como funciona a verificação</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-[#0F1A2E]/70">
          <li>
            <span className="font-semibold text-[#0F1A2E]">OTP obrigatório:</span> WhatsApp/telefone/email verificado por código (5 min, cookie HMAC 24h) — sem isto não publica (`CONTACT_NOT_VERIFIED`).
          </li>
          <li>
            <span className="font-semibold text-[#0F1A2E]">Identidade opcional:</span> Pedido em `Verificação` com NUIT/alvará → fila `pending/in_review` → `admin` aprova/rejeita em 24–48h → `badge verificado` + `organization.verificationStatus=verified`.
          </li>
          <li>
            <span className="font-semibold text-[#0F1A2E]">Foto:</span> não bloqueia verificação, mas conta para `profile-complete` (nome+descrição+≥1 categoria+logo|cover) e selo `profile-complete` via `badges.job.ts`.
          </li>
        </ol>
      </div>
    </div>
  )
}

function SettingsPhotoCard({ profile, organizationId, canEdit }: { profile: { id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null } | null; organizationId: string; canEdit: boolean }) {
  // Lazy import client para não tornar a page client
  const Card = require("./photo-card").PhotoCard as typeof import("./photo-card").PhotoCard
  return <Card profile={profile} organizationId={organizationId} canEdit={canEdit} />
}
