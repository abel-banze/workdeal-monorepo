"use client"

import { useState } from "react"
import Image from "next/image"
import { createPortfolioItem, updatePortfolioItem, deletePortfolioItem } from "@/app/actions/portfolio"

type Item = { id: string; title: string; description: string | null; imageUrl: string | null; sortOrder: number }

export function PortfolioManager({ profileId, initial }: { profileId: string; initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máx 5 MB")
      return
    }
    const local = URL.createObjectURL(file)
    setPreview(local)
    setUploading(true)
    try {
      const { uploadFilesAction } = await import("@/app/actions/files")
      const fd = new FormData()
      fd.set("file", file, file.name)
      fd.set("purpose", "generic")
      const res = await uploadFilesAction(fd)
      if (!res.ok) throw new Error(res.error)
      setImageUrl(res.file.url)
    } catch (e) {
      setPreview(null)
      URL.revokeObjectURL(local)
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setUploading(false)
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError("Título obrigatório")
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const res = await createPortfolioItem({ profileId, title: title.trim(), description: description.trim() || null, imageUrl: imageUrl.trim() || null })
      const created = (res as { data: Item }).data
      setItems((prev) => [...prev, created])
      setMsg("Item adicionado — conta para perfil-completo.")
      setTitle("")
      setDescription("")
      setImageUrl("")
      if (preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function onUpdate() {
    if (!editing) return
    setSaving(true)
    setError(null)
    try {
      const res = await updatePortfolioItem(editing.id, { title: editing.title, description: editing.description, imageUrl: editing.imageUrl })
      const updated = (res as { data: Item }).data
      setItems((prev) => prev.map((it) => (it.id === editing.id ? updated : it)))
      setEditing(null)
      setMsg("Actualizado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Remover este item?")) return
    try {
      await deletePortfolioItem(id)
      setItems((prev) => prev.filter((it) => it.id !== id))
      setMsg("Removido.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha")
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onCreate} className="rounded-[20px] border border-[#D9D2C2] bg-white p-5">
        <h2 className="text-sm font-black text-[#0F1A2E]">Adicionar obra</h2>
        <p className="mt-1 text-xs text-[#0F1A2E]/60">{items.length}/12 itens · Ideal imagem 1200×800.</p>
        <div className="mt-3 grid gap-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título * ex: Remodelação escritório Maputo" maxLength={80} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (até 500)" maxLength={500} rows={3} className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
          <div className="flex items-center gap-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] flex items-center justify-center">
              {preview || imageUrl ? <Image src={preview ?? imageUrl} alt="Preview" fill className="object-cover" /> : <span className="text-[11px] font-bold text-[#0F1A2E]/30">IMG</span>}
              {uploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="size-4 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]" /></span>}
            </div>
            <label className="inline-flex cursor-pointer rounded-full border bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
              {uploading ? "A carregar…" : "Carregar imagem"}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = "" }} />
            </label>
            {(preview || imageUrl) && (
              <button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setImageUrl(""); }} className="text-xs font-semibold text-[#7A1A0A]">
                Remover
              </button>
            )}
          </div>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://... ou carrega acima" className="rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E]" />
        </div>
        <button type="submit" disabled={saving || uploading || items.length >= 12} className="mt-4 inline-flex rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
          {saving ? "A guardar…" : "Adicionar ao portfólio"}
        </button>
        {error && <p className="mt-3 rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs text-[#7A1A0A]">{error}</p>}
        {msg && <p className="mt-3 rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs text-[#0B5E56]">{msg}</p>}
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.id} className="overflow-hidden rounded-[16px] border border-[#D9D2C2] bg-white">
            {it.imageUrl ? <div className="relative h-40 w-full bg-[#F6F3EE]"><Image src={it.imageUrl} alt={it.title} fill className="object-cover" /></div> : <div className="h-40 bg-[#F6F3EE] grid place-items-center text-xs text-[#0F1A2E]/40">Sem imagem</div>}
            <div className="p-4">
              {editing?.id === it.id ? (
                <div className="space-y-2">
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-lg border border-[#D9D2C2] bg-white px-3 py-2 text-sm" />
                  <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full rounded-lg border border-[#D9D2C2] bg-white px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => onUpdate()} disabled={saving} className="flex-1 rounded-full bg-[#0B5E56] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A4A44]">
                      Guardar
                    </button>
                    <button onClick={() => setEditing(null)} className="flex-1 rounded-full border bg-white px-4 py-2 text-xs font-semibold">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-black leading-tight text-[#0F1A2E]">{it.title}</h3>
                  {it.description && <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60 line-clamp-3">{it.description}</p>}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setEditing(it)} className="rounded-full border border-[#D9D2C2] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#F6F3EE]">
                      Editar
                    </button>
                    <button onClick={() => onDelete(it.id)} className="rounded-full border border-[#FF3B1F]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10">
                      Remover
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="rounded-xl border border-dashed border-[#D9D2C2] bg-white p-6 text-center text-sm text-[#0F1A2E]/50">Ainda sem obras — adiciona a primeira para desbloquear o selo perfil-completo.</p>}
    </div>
  )
}
