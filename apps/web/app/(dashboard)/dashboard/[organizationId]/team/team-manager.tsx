"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

type Member = { id: string; userId: string; name: string; email: string; role: string; createdAt: string }
type Invite = { id: string; email: string; role: string; status: string; createdAt: string }

export function TeamManager({ organizationId, members, invites, canManage, currentUserId }: { organizationId: string; members: Member[]; invites: Invite[]; canManage: boolean; currentUserId: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"member" | "editor" | "admin">("member")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage) return
    setLoading(true)
    setError(null)
    setMsg(null)
    try {
      const res = await (authClient.organization.inviteMember as unknown as (p: { organizationId: string; email: string; role: string; resend?: boolean }) => Promise<{ error?: { message?: string } }>)({ organizationId, email: email.trim().toLowerCase(), role, resend: true })
      if ((res as { error?: { message?: string } })?.error) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Falha ao convidar")
      setMsg(`Convite enviado para ${email.trim().toLowerCase()} como ${role}.`)
      setEmail("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao convidar")
    } finally {
      setLoading(false)
    }
  }

  async function onUpdateRole(memberId: string, newRole: string) {
    if (!canManage) return
    setError(null)
    try {
      const res = await (authClient.organization.updateMemberRole as unknown as (p: { organizationId: string; memberId: string; role: string }) => Promise<{ error?: { message?: string } }>)({ organizationId, memberId, role: newRole })
      if ((res as { error?: { message?: string } })?.error) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Falha")
      setMsg("Papel actualizado.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao actualizar papel")
    }
  }

  async function onRemove(memberId: string) {
    if (!canManage) return
    if (!confirm("Remover este membro?")) return
    setError(null)
    try {
      const res = await (authClient.organization.removeMember as unknown as (p: { organizationId: string; memberIdOrEmail: string }) => Promise<{ error?: { message?: string } }>)({ organizationId, memberIdOrEmail: memberId })
      if ((res as { error?: { message?: string } })?.error) throw new Error((res as { error?: { message?: string } }).error?.message ?? "Falha")
      setMsg("Membro removido.")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover")
    }
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <form onSubmit={onInvite} className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <h2 className="text-sm font-black text-[#0F1A2E]">Convidar membro</h2>
          <p className="mt-1 text-xs text-[#0F1A2E]/60">Apenas owner/admin. Convite expira em 48h (invitation.expiresAt).</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.co.mz" type="email" required className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/40 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15" />
            <select value={role} onChange={(e) => setRole(e.target.value as never)} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
              <option value="member">member — só tarefas:view</option>
              <option value="editor">editor — profile:edit + tasks:manage</option>
              <option value="admin">admin — members:manage + tudo</option>
            </select>
            <button type="submit" disabled={loading} className="rounded-full bg-[#0F1A2E] px-6 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
              {loading ? "A enviar…" : "Convidar"}
            </button>
          </div>
        </form>
      )}

      {(msg || error) && (
        <div className="space-y-2">
          {msg && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs font-medium text-[#0B5E56]">{msg}</p>}
          {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}
        </div>
      )}

      <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <h2 className="text-sm font-black text-[#0F1A2E]">Membros ({members.length})</h2>
        <ul className="mt-3 divide-y divide-[#D9D2C2]/60">
          {members.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0F1A2E]">
                  {m.name} <span className="font-normal text-[#0F1A2E]/60">{m.email}</span> {m.userId === currentUserId && <span className="ml-1 rounded-full bg-[#F6F3EE] px-2 py-0.5 text-[10px] font-bold text-[#0F1A2E]/60">TU</span>}
                </p>
                <p className="text-xs text-[#0F1A2E]/50">Desde {new Date(m.createdAt).toLocaleDateString("pt-MZ")} · {m.role}</p>
              </div>
              {canManage && m.userId !== currentUserId && (
                <div className="flex gap-2">
                  <select value={m.role} onChange={(e) => onUpdateRole(m.id, e.target.value)} className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs font-semibold text-[#0F1A2E]">
                    <option value="member">member</option>
                    <option value="editor">editor</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                  <button onClick={() => onRemove(m.id)} className="rounded-full border border-[#FF3B1F]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10">
                    Remover
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {invites.length > 0 && (
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <h2 className="text-sm font-black text-[#0F1A2E]">Convites pendentes ({invites.filter((i) => i.status === "pending").length})</h2>
          <ul className="mt-3 divide-y divide-[#D9D2C2]/60">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-[#0F1A2E]">
                  {inv.email} <span className="text-xs text-[#0F1A2E]/50">· {inv.role} · {inv.status}</span>
                </span>
                <span className="text-xs text-[#0F1A2E]/40">{new Date(inv.createdAt).toLocaleDateString("pt-MZ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
