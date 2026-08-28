"use client"

import { useState } from "react"
import { createEvent, listEventRegistrations, updateEvent, updateRegistrationStatus } from "@/app/actions/events"
import type { EventListItem } from "./page"

const PROVINCES = ["Cidade de Maputo", "Matola", "Gaza", "Inhambane", "Sofala", "Manica", "Tete", "Zambézia", "Nampula", "Niassa", "Cabo Delgado"]

const EVENT_STYLES: Record<string, { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-[#6B7280] text-white" },
  published: { label: "Publicado", cls: "bg-[#0B5E56] text-white" },
  cancelled: { label: "Cancelado", cls: "bg-[#FF3B1F] text-white" },
  ended: { label: "Concluído", cls: "bg-[#0F766E] text-white" },
}

const REG_STYLES: Record<string, { label: string; cls: string }> = {
  registered: { label: "Inscrito", cls: "bg-[#0F1A2E] text-white" },
  checked_in: { label: "Presente", cls: "bg-[#0B5E56] text-white" },
  cancelled: { label: "Cancelado", cls: "bg-[#FF3B1F] text-white" },
}

type RegistrationItem = {
  id: string
  eventId: string
  userId: string
  userName: string | null
  userEmail: string | null
  userImage: string | null
  status: string
  createdAt: string
}

type CreateForm = {
  title: string
  categoryId: string
  description: string
  startAt: string
  endAt: string
  isOnline: boolean
  onlineUrl: string
  venueName: string
  province: string
  district: string
  address: string
  capacity: string
  coverImage: string
}

const emptyCreate: CreateForm = {
  title: "",
  categoryId: "",
  description: "",
  startAt: "",
  endAt: "",
  isOnline: false,
  onlineUrl: "",
  venueName: "",
  province: "",
  district: "",
  address: "",
  capacity: "",
  coverImage: "",
}

export function EventsManager({
  initial,
  categories,
  canManage,
  organizerProfileId,
  organizerName,
  orgName,
}: {
  initial: EventListItem[]
  categories: { id: string; name: string }[]
  canManage: boolean
  organizerProfileId: string | null
  organizerName: string | null
  orgName: string
}) {
  const [events, setEvents] = useState<EventListItem[]>(initial)
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyCreate)
  const [uploading, setUploading] = useState(false)
  const [regsByEvent, setRegsByEvent] = useState<Record<string, RegistrationItem[]>>({})
  const [regLoading, setRegLoading] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  function catName(id: string | null): string {
    if (!id) return ""
    return categories.find((c) => c.id === id)?.name ?? ""
  }

  function fmtDate(iso: string): string {
    const d = new Date(iso)
    return `${d.toLocaleDateString("pt-MZ")} · ${d.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`
  }

  async function handleCover(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máx 5 MB")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const { uploadFilesAction } = await import("@/app/actions/files")
      const fd = new FormData()
      fd.set("file", file, file.name)
      fd.set("purpose", "generic")
      const res = await uploadFilesAction(fd)
      if (!res.ok) throw new Error(res.error)
      setForm((f) => ({ ...f, coverImage: res.file.url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar imagem")
    } finally {
      setUploading(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage) return
    if (!organizerProfileId) {
      setError("Cria primeiro um perfil público para organizar eventos.")
      return
    }
    if (form.title.trim().length < 3) {
      setError("Título deve ter pelo menos 3 caracteres")
      return
    }
    if (form.description.trim().length < 10) {
      setError("Descrição deve ter pelo menos 10 caracteres")
      return
    }
    if (!form.startAt || !form.endAt) {
      setError("Data de início e fim são obrigatórias")
      return
    }
    const startAt = new Date(form.startAt)
    const endAt = new Date(form.endAt)
    if (endAt <= startAt) {
      setError("Fim do evento deve ser depois do início")
      return
    }
    if (form.isOnline && form.onlineUrl.trim() && !form.onlineUrl.startsWith("http")) {
      setError("O link do evento online deve começar com http(s)")
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const res = (await createEvent({
        organizerProfileId,
        categoryId: form.categoryId || null,
        title: form.title.trim(),
        description: form.description.trim(),
        startAt,
        endAt,
        isOnline: form.isOnline,
        onlineUrl: form.isOnline ? (form.onlineUrl.trim() || null) : null,
        venueName: form.venueName.trim() || null,
        province: form.province || null,
        district: form.district.trim() || null,
        address: form.address.trim() || null,
        coverImage: form.coverImage.trim() || null,
        capacity: form.capacity === "" ? null : Number.parseInt(form.capacity, 10),
      })) as unknown as { data: EventListItem }
      const created = res.data
      setEvents((prev) => [created, ...prev])
      setForm(emptyCreate)
      setOpenCreate(false)
      setMsg("Evento criado como rascunho — publica quando estiver pronto.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar evento")
    } finally {
      setSaving(false)
    }
  }

  async function onStatus(id: string, status: string) {
    setBusyId(id)
    setError(null)
    setMsg(null)
    try {
      await updateEvent(id, { status })
      setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, status } : ev)))
      setMsg(status === "published" ? "Evento publicado." : "Evento actualizado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusyId(null)
    }
  }

  async function toggleRegistrations(eventId: string) {
    if (regsByEvent[eventId]) {
      setRegsByEvent((prev) => {
        const next = { ...prev }
        delete next[eventId]
        return next
      })
      return
    }
    setRegLoading(eventId)
    setError(null)
    try {
      const res = await listEventRegistrations(eventId)
      const items = ((res.data as { items?: RegistrationItem[] } | null)?.items ?? []) as RegistrationItem[]
      setRegsByEvent((prev) => ({ ...prev, [eventId]: items }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar inscrições")
    } finally {
      setRegLoading(null)
    }
  }

  async function onRegStatus(eventId: string, regId: string, status: "checked_in" | "cancelled") {
    setBusyId(regId)
    setError(null)
    try {
      await updateRegistrationStatus({ registrationId: regId, status })
      setRegsByEvent((prev) => ({
        ...prev,
        [eventId]: (prev[eventId] ?? []).map((r) => (r.id === regId ? { ...r, status } : r)),
      }))
      if (status === "checked_in") setMsg("Presença confirmada.")
      else setMsg("Inscrição cancelada.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs text-[#0B5E56]">{msg}</p>}
      {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}

      {canManage && (
        <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#0F1A2E]">Criar evento</h2>
              <p className="mt-0.5 text-xs text-[#0F1A2E]/55">
                Organizador: {organizerName ?? "perfil a definir"} · {orgName}. Guarda como rascunho até publicares.
              </p>
            </div>
            <button type="button" onClick={() => setOpenCreate((v) => !v)} className="rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
              {openCreate ? "Fechar" : "Novo evento +"}
            </button>
          </div>
          {openCreate && (
            <form onSubmit={onCreate} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título *" maxLength={160} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
                  <option value="">Categoria (opcional)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} type="datetime-local" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} type="datetime-local" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <select value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
                  <option value="">Província (opcional)</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="Distrito (opcional)" maxLength={80} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} placeholder="Local do evento (opcional)" maxLength={160} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Endereço (opcional)" maxLength={255} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} type="number" min={1} placeholder="Capacidade (opcional)" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                <label className="flex items-center gap-2 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]">
                  <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm({ ...form, isOnline: e.target.checked })} className="size-4 accent-[#0B5E56]" />
                  Evento online
                </label>
                {form.isOnline && (
                  <input value={form.onlineUrl} onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })} placeholder="Link do evento online (Zoom/Meet...)" maxLength={500} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
                )}
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição * (mín. 10 caracteres)" rows={4} className="w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                  {uploading ? "A carregar…" : form.coverImage ? "Trocar imagem" : "Imagem de capa"}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCover(f); e.target.value = "" }} />
                </label>
                {form.coverImage && (
                  <span className="truncate text-xs text-[#0B5E56]">✓ capa pronta</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving || uploading} className="rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
                  {saving ? "A criar…" : "Criar evento (rascunho)"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {events.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#0F1A2E]/50">Ainda sem eventos neste estado.</p>
      )}

      <div className="space-y-3">
        {events.map((ev) => {
          const st = EVENT_STYLES[ev.status] ?? { label: ev.status, cls: "bg-[#6B7280] text-white" }
          const regs = regsByEvent[ev.id]
          const activeRegs = (regs ?? []).filter((r) => r.status !== "cancelled").length
          return (
            <div key={ev.id} className="overflow-hidden rounded-[18px] border border-[#D9D2C2] bg-white">
              <div className="flex flex-wrap items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-black leading-tight text-[#0F1A2E]">{ev.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                    {catName(ev.categoryId) && <span className="text-xs font-semibold text-[#0B5E56]">{catName(ev.categoryId)}</span>}
                  </div>
                  <p className="mt-1 text-xs text-[#0F1A2E]/55">
                    {fmtDate(ev.startAt)} · {ev.isOnline ? "online" : [ev.venueName, ev.province].filter(Boolean).join(" · ") || "local a definir"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono font-semibold text-[#0F1A2E]">
                    {ev.registrationCount}{ev.capacity ? `/${ev.capacity}` : ""} inscrições
                  </span>
                </div>
              </div>
              {ev.description && <p className="line-clamp-2 px-4 pb-3 text-[13px] leading-relaxed text-[#0F1A2E]/60">{ev.description}</p>}

              <div className="flex flex-wrap items-center gap-2 border-t border-[#D9D2C2]/60 px-4 py-2.5">
                {ev.status === "draft" && canManage && (
                  <button onClick={() => onStatus(ev.id, "published")} disabled={busyId === ev.id} className="rounded-full bg-[#0B5E56] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">
                    Publicar
                  </button>
                )}
                {ev.status === "published" && canManage && (
                  <button onClick={() => toggleRegistrations(ev.id)} disabled={regLoading === ev.id} className="rounded-full bg-[#0F1A2E] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50">
                    {regLoading === ev.id ? "A carregar…" : regs ? "Fechar inscrições" : `Ver inscrições (${ev.registrationCount})`}
                  </button>
                )}
                {ev.slug && (
                  <a href={`/events/${ev.slug}`} target="_blank" rel="noreferrer" className="rounded-full border border-[#D9D2C2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F1A2E]/70 hover:border-[#0F1A2E]">
                    Ver página ↗
                  </a>
                )}
                {(ev.status === "draft" || ev.status === "published") && canManage && (
                  <button onClick={() => onStatus(ev.id, "cancelled")} disabled={busyId === ev.id} className="ml-auto rounded-full border border-[#FF3B1F]/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">
                    Cancelar evento
                  </button>
                )}
              </div>

              {regs && (
                <div className="border-t border-[#D9D2C2]/60 bg-[#F6F3EE]/60 p-4">
                  <p className="text-xs font-black text-[#0F1A2E]">
                    Inscrições · {activeRegs} activa{activeRegs === 1 ? "" : "s"}
                  </p>
                  {regs.length === 0 && <p className="mt-2 text-xs text-[#0F1A2E]/50">Ninguém inscrito ainda.</p>}
                  <ul className="mt-2 divide-y divide-[#D9D2C2]/60">
                    {regs.map((r) => {
                      const rs = REG_STYLES[r.status] ?? { label: r.status, cls: "bg-[#6B7280] text-white" }
                      return (
                        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#0F1A2E]">{r.userName ?? "Utilizador"}</p>
                            {r.userEmail && <p className="truncate text-xs text-[#0F1A2E]/55">{r.userEmail}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${rs.cls}`}>{rs.label}</span>
                            {canManage && r.status === "registered" && (
                              <button onClick={() => onRegStatus(ev.id, r.id, "checked_in")} disabled={busyId === r.id} className="rounded-full bg-[#0B5E56] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">
                                Check-in
                              </button>
                            )}
                            {canManage && (r.status === "registered" || r.status === "checked_in") && (
                              <button onClick={() => onRegStatus(ev.id, r.id, "cancelled")} disabled={busyId === r.id} className="rounded-full border border-[#FF3B1F]/25 bg-white px-3 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10 disabled:opacity-50">
                                Cancelar
                              </button>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}