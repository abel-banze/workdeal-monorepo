import { notFound, redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { getOrgRole } from "@workdeal/auth/repository"
import { VerificationForm } from "./verification-form"

export default async function VerificationPage({ params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params
  if (organizationId === "personal") redirect("/dashboard")
  const session = await requireAuth()
  const role = await getOrgRole(session.user.id, organizationId)
  if (!role) notFound()

  const { listUserOrganizations } = await import("@workdeal/auth/repository")
  const orgs = await listUserOrganizations(session.user.id)
  const org = orgs.find((o) => o.id === organizationId)
  const orgSlug = org?.slug
  const orgName = org?.name ?? organizationId

  let profile: { id: string; name: string; slug: string } | null = null
  let verifications: { id: string; status: string; createdAt: string; reviewNote?: string | null }[] = []
  let error: string | null = null

  try {
    const { apiFetch } = await import("@/lib/api")
    const { cookies } = await import("next/headers")
    const { JWT_COOKIE_NAME } = await import("@workdeal/auth/cookies")
    const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null
    if (orgSlug && token) {
      const { apiFetchWithAuth } = await import("@/lib/api")
      const pRes = await apiFetchWithAuth<{ id: string; name: string; slug: string }>(`/api/v1/profiles/${orgSlug}`, token, { cache: "no-store" } as RequestInit).catch(() => null)
      // fallback via public fetch
      let prof = pRes?.data ?? null
      if (!prof) {
        const pub = await apiFetch<{ id: string; name: string; slug: string } | null>(`/api/v1/profiles/${orgSlug}`, { cache: "no-store" }).catch(() => ({ data: null } as never))
        prof = pub.data
      }
      profile = prof
      if (profile?.id && token) {
        const vRes = await apiFetchWithAuth<{ id: string; status: string; createdAt: string; reviewNote?: string | null }[]>(`/api/v1/verifications/my`, token, { cache: "no-store" } as RequestInit).catch(() => ({ data: [] } as never))
        // filtra por profileId (my retorna só do perfil actual, mas pode vir vazio para org)
        const all = (vRes as { data?: unknown[] })?.data as typeof verifications | undefined
        verifications = Array.isArray(all) ? (all as typeof verifications) : []
        // Se my não retornou para org, tenta buscar directo por profileId via DB (fallback: vazio)
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }

  const latest = verifications[0]
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "bg-[#F6F3EE] text-[#0F1A2E] border-[#D9D2C2]" },
    in_review: { label: "Em análise", color: "bg-[#0F1A2E] text-white" },
    approved: { label: "Verificada", color: "bg-[#0B5E56] text-white" },
    rejected: { label: "Rejeitada", color: "bg-[#FF3B1F] text-white" },
  }

  return (
    <div className="mx-auto w-full max-w-[880px] space-y-5 pb-10">
      <div className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">VERIFICAÇÃO · {orgName}</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Selo “Verificada”
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Perfil verificado ganha destaque, selo e prioridade no ranking. Prazo BRD: 24–48h úteis. Contactos já verificados por OTP aceleram aprovação.
        </p>
        {!profile ? (
          <div className="mt-4 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] p-4">
            <p className="text-sm font-bold text-[#0F1A2E]">Sem perfil público</p>
            <p className="text-xs text-[#0F1A2E]/60">Cria o perfil da empresa primeiro para pedir verificação.</p>
          </div>
        ) : latest ? (
          <div className="mt-4 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusMap[latest.status]?.color ?? "bg-white"}`}>{statusMap[latest.status]?.label ?? latest.status}</span>
              <span className="text-xs text-[#0F1A2E]/50">{new Date(latest.createdAt).toLocaleDateString("pt-MZ")}</span>
            </div>
            {latest.reviewNote && <p className="mt-2 text-xs text-[#0F1A2E]/70">Nota: {latest.reviewNote}</p>}
            <p className="mt-2 text-xs text-[#0F1A2E]/50">ID: {latest.id}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 p-4">
            <p className="text-sm font-bold text-[#0F1A2E]">Pronta para pedir</p>
            <p className="text-xs text-[#0F1A2E]/60">Nenhum pedido activo. Usa o botão abaixo — podes anexar NUIT/alvará na nota.</p>
          </div>
        )}
        {error && <p className="mt-3 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}
      </div>

      {profile && <VerificationForm profileId={profile.id} hasPending={latest?.status === "pending" || latest?.status === "in_review"} />}

      {verifications.length > 1 && (
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <h2 className="text-sm font-black text-[#0F1A2E]">Histórico</h2>
          <ul className="mt-3 divide-y divide-[#D9D2C2]/60">
            {verifications.slice(1).map((v) => (
              <li key={v.id} className="flex items-center justify-between py-2.5">
                <span className="text-xs font-medium text-[#0F1A2E]">{v.id.slice(0, 8)} · {statusMap[v.status]?.label ?? v.status}</span>
                <span className="text-xs text-[#0F1A2E]/50">{new Date(v.createdAt).toLocaleDateString("pt-MZ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
