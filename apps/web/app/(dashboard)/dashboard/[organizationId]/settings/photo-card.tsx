"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function PhotoCard({ profile, organizationId: _organizationId, canEdit }: { profile: { id: string; name: string; slug: string; logoUrl: string | null; coverUrl: string | null } | null; organizationId: string; canEdit: boolean }) {
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl ?? "")
  const [coverUrl, setCoverUrl] = useState(profile?.coverUrl ?? "")
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleFile(file: File, purpose: "logo" | "generic", onUrl: (url: string) => void, setPreview: (v: string | null) => void, setUploading: (v: boolean) => void) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Máximo 5 MB.")
      return
    }
    const local = URL.createObjectURL(file)
    setPreview(local)
    setUploading(true)
    try {
      const { uploadFilesAction } = await import("@/app/actions/files")
      const fd = new FormData()
      fd.set("file", file, file.name)
      fd.set("purpose", purpose)
      const res = await uploadFilesAction(fd)
      if (!res.ok) throw new Error(res.error)
      onUrl(res.file.url)
      setSuccess(purpose === "logo" ? "Logótipo carregado — guarda para publicar." : "Capa carregada — guarda para publicar.")
    } catch (e) {
      setPreview(null)
      URL.revokeObjectURL(local)
      setError(e instanceof Error ? e.message : "Falha")
    } finally {
      setUploading(false)
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit) {
      setError("Sem permissão profile:edit")
      return
    }
    if (!profile) {
      setError("Sem perfil para actualizar")
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { updateProfile } = await import("@/app/actions/profiles")
      await updateProfile(profile.slug, { logoUrl: logoUrl || null, coverUrl: coverUrl || null })
      setSuccess("Foto actualizada — revalidação do directório em curso.")
      // limpa previews revogáveis
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
        setLogoPreview(null)
      }
      if (coverPreview) {
        URL.revokeObjectURL(coverPreview)
        setCoverPreview(null)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao guardar")
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return <p className="text-xs text-[#0F1A2E]/60">Cria o perfil primeiro em “Editar perfil completo”.</p>
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE]/50 p-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white flex items-center justify-center">
          {logoPreview || logoUrl ? (
            <Image src={logoPreview ?? logoUrl} alt={`${profile.name} logótipo`} fill sizes="64px" className="object-cover" />
          ) : (
            <span className="text-[11px] font-black tracking-[0.14em] text-[#0F1A2E]/30">LOGO</span>
          )}
          {logoUploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="size-4 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]" /></span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer rounded-full border bg-white px-4 py-2 text-xs font-bold text-[#0F1A2E] hover:bg-[#F6F3EE] ${!canEdit ? "opacity-50 pointer-events-none" : ""}`}>
            {logoUploading ? "A carregar…" : "Carregar logótipo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={logoUploading || !canEdit} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, "logo", setLogoUrl, setLogoPreview, setLogoUploading); e.target.value = "" }} />
          </label>
          {(logoPreview || logoUrl) && canEdit && (
            <button type="button" onClick={() => { if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoPreview(null); setLogoUrl(""); }} className="rounded-full border border-[#FF3B1F]/20 bg-white px-4 py-2 text-xs font-semibold text-[#7A1A0A] hover:bg-[#FF3B1F]/10">
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#D9D2C2] bg-[#F6F3EE]/50">
        <div className="relative h-32 w-full bg-white flex items-center justify-center overflow-hidden">
          {coverPreview || coverUrl ? <Image src={coverPreview ?? coverUrl} alt="Capa" fill className="object-cover" /> : <span className="text-xs font-medium text-[#0F1A2E]/40">Sem capa — 1200×400 recomendado</span>}
          {coverUploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="size-5 animate-spin rounded-full border-2 border-[#0F1A2E]/20 border-t-[#0B5E56]" /></span>}
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          <label className={`inline-flex cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted ${!canEdit ? "opacity-50 pointer-events-none" : ""}`}>
            {coverUploading ? "A carregar…" : "Carregar capa"}
            <input type="file" accept="image/*" className="hidden" disabled={coverUploading || !canEdit} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, "generic", setCoverUrl, setCoverPreview, setCoverUploading); e.target.value = "" }} />
          </label>
          {(coverPreview || coverUrl) && canEdit && (
            <button type="button" onClick={() => { if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverPreview(null); setCoverUrl(""); }} className="rounded-full border border-[#FF3B1F]/20 px-3 py-1.5 text-xs font-medium text-[#7A1A0A]">Remover capa</button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>}
      {success && <p className="rounded-lg border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-3 py-2 text-xs font-medium text-[#0B5E56]">{success}</p>}

      <button type="submit" disabled={saving || logoUploading || coverUploading || !canEdit} className="inline-flex rounded-full bg-[#0F1A2E] px-6 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50">
        {saving ? "A guardar…" : "Guardar foto"}
      </button>
      <p className="text-xs leading-relaxed text-[#0F1A2E]/40">Actualiza `logoUrl/coverUrl` via `PATCH /profiles/:slug` com `profile:edit` + `revalidateTag("profiles")` — visível em /profiles/[slug] com `next/image`.</p>
    </form>
  )
}
