"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { UpdateProfileInput } from "@workdeal/shared"
import { updateProfile } from "@/app/actions/profiles"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"

type Category = { id: string; slug: string; name: string }
type Profile = {
  id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  logoUrl: string | null
  coverUrl: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  website: string | null
  categories: { id: string; slug: string; name: string; isPrimary: boolean }[]
}

export function EditProfileForm({
  initialProfile,
  categories,
  isCompany = false,
  initialQualification = null,
  organizationId = null,
}: {
  initialProfile: Profile
  categories: Category[]
  isCompany?: boolean
  initialQualification?: { workers: number; turnoverMzn: number | null; foundedYear: number | null; legalForm: string | null; nuit: string | null; alvara: string | null; capitalSocialMzn: number | null; licenses: string[] | null } | null
  organizationId?: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState(initialProfile.name)
  const [slug, setSlug] = useState(initialProfile.slug)
  const [tagline, setTagline] = useState(initialProfile.tagline ?? "")
  const [description, setDescription] = useState(initialProfile.description ?? "")
  const [logoUrl, setLogoUrl] = useState(initialProfile.logoUrl ?? "")
  const [coverUrl, setCoverUrl] = useState(initialProfile.coverUrl ?? "")
  const [whatsapp, setWhatsapp] = useState(initialProfile.whatsapp ?? "")
  const [phone, setPhone] = useState(initialProfile.phone ?? "")
  const [email, setEmail] = useState(initialProfile.email ?? "")
  const [website, setWebsite] = useState(initialProfile.website ?? "")
  const [selectedCats, setSelectedCats] = useState<string[]>(() => initialProfile.categories.map((c) => c.id))
  const [workers, setWorkers] = useState(initialQualification?.workers?.toString() ?? "")
  const [turnover, setTurnover] = useState(initialQualification?.turnoverMzn?.toString() ?? "")
  const [foundedYear, setFoundedYear] = useState(initialQualification?.foundedYear?.toString() ?? "")
  const [legalForm, setLegalForm] = useState(initialQualification?.legalForm ?? "")
  const [nuit, setNuit] = useState(initialQualification?.nuit ?? "")
  const [alvara, setAlvara] = useState(initialQualification?.alvara ?? "")
  const [capital, setCapital] = useState(initialQualification?.capitalSocialMzn?.toString() ?? "")
  const [licenses, setLicenses] = useState(initialQualification?.licenses?.join(", ") ?? "")
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [coverUploading, setCoverUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleFile(file: File, purpose: "logo" | "generic", onUrl: (url: string) => void, setPreview: (v: string | null) => void, setUploading: (v: boolean) => void) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são permitidas para logo/capa.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande — máximo 5 MB.")
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
      setSuccess(purpose === "logo" ? "Logótipo carregado." : "Capa carregada.")
    } catch (e) {
      setPreview(null)
      URL.revokeObjectURL(local)
      setError(e instanceof Error ? e.message : "Falha ao carregar ficheiro")
    } finally {
      setUploading(false)
    }
  }

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) return prev
      return [...prev, id]
    })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name.trim() || name.trim().length < 2) {
      setError("Nome deve ter pelo menos 2 caracteres")
      return
    }
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setError("Slug inválido: apenas minúsculas, números e hífens")
      return
    }

    setLoading(true)
    try {
      const payload: UpdateProfileInput = {}

      const trimmedName = name.trim()
      if (trimmedName !== initialProfile.name) payload.name = trimmedName

      const trimmedSlug = slug.trim()
      if (trimmedSlug && trimmedSlug !== initialProfile.slug) payload.slug = trimmedSlug

      const tTagline = tagline.trim()
      if (tTagline !== (initialProfile.tagline ?? "")) payload.tagline = tTagline || null

      const tDesc = description.trim()
      if (tDesc !== (initialProfile.description ?? "")) payload.description = tDesc || null

      const tLogo = logoUrl.trim()
      if (tLogo !== (initialProfile.logoUrl ?? "")) payload.logoUrl = tLogo || null

      const tCover = coverUrl.trim()
      if (tCover !== (initialProfile.coverUrl ?? "")) payload.coverUrl = tCover || null

      const tWa = whatsapp.trim()
      if (tWa !== (initialProfile.whatsapp ?? "")) payload.whatsapp = tWa || null

      const tPhone = phone.trim()
      if (tPhone !== (initialProfile.phone ?? "")) payload.phone = tPhone || null

      const tEmail = email.trim()
      if (tEmail !== (initialProfile.email ?? "")) payload.email = tEmail || null

      const tWebsite = website.trim()
      if (tWebsite !== (initialProfile.website ?? "")) payload.website = tWebsite || null

      // categories: send if changed
      const initialIds = new Set(initialProfile.categories.map((c) => c.id))
      const changed = selectedCats.length !== initialIds.size || selectedCats.some((id) => !initialIds.has(id))
      if (changed) payload.categoryIds = selectedCats

      const hasProfileChanges = Object.keys(payload).length > 0
      let hasQualChanges = false
      if (isCompany && organizationId) {
        const w = workers.trim() ? parseInt(workers.replace(/\D/g, ""), 10) : null
        const t = turnover.trim() ? parseInt(turnover.replace(/\D/g, ""), 10) : null
        const fy = foundedYear.trim() ? parseInt(foundedYear, 10) : null
        const cap = capital.trim() ? parseInt(capital.replace(/\D/g, ""), 10) : null
        const lic = licenses.trim() ? licenses.split(",").map((s) => s.trim()).filter(Boolean) : null
        hasQualChanges =
          (w ?? null) !== (initialQualification?.workers ?? null) ||
          (t ?? null) !== (initialQualification?.turnoverMzn ?? null) ||
          (fy ?? null) !== (initialQualification?.foundedYear ?? null) ||
          (legalForm || null) !== (initialQualification?.legalForm ?? null) ||
          (nuit.trim() || null) !== (initialQualification?.nuit ?? null) ||
          (alvara.trim() || null) !== (initialQualification?.alvara ?? null) ||
          (cap ?? null) !== (initialQualification?.capitalSocialMzn ?? null) ||
          JSON.stringify(lic) !== JSON.stringify(initialQualification?.licenses ?? null)
      }

      if (!hasProfileChanges && !hasQualChanges) {
        setSuccess("Nenhuma alteração para guardar.")
        setLoading(false)
        return
      }

      let updatedSlug: string | null = null
      if (hasProfileChanges) {
        const res = await updateProfile(initialProfile.slug, payload)
        const updated = (res as { data?: { slug?: string } })?.data
        updatedSlug = updated?.slug && updated.slug !== initialProfile.slug ? updated.slug : null
      }

      if (hasQualChanges && organizationId) {
        const w = parseInt(workers.replace(/\D/g, ""), 10)
        if (!Number.isFinite(w) || w < 1) throw new Error("Nº trabalhadores obrigatório e ≥1")
        const { upsertCompanyQualification } = await import("@/app/actions/company-qualification")
        await upsertCompanyQualification({
          organizationId,
          profileId: initialProfile.id,
          workers: w,
          turnoverMzn: turnover.trim() ? parseInt(turnover.replace(/\D/g, ""), 10) : null,
          foundedYear: foundedYear.trim() ? parseInt(foundedYear.trim(), 10) : null,
          legalForm: legalForm || null,
          nuit: nuit.trim() || null,
          alvara: alvara.trim() || null,
          capitalSocialMzn: capital.trim() ? parseInt(capital.replace(/\D/g, ""), 10) : null,
          licenses: licenses.trim() ? licenses.split(",").map((s) => s.trim()).filter(Boolean) : null,
        })
      }

      setSuccess("Perfil actualizado com sucesso.")
      if (updatedSlug) {
        router.push(`/profiles/${updatedSlug}`)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao actualizar perfil")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{isCompany ? "Editar perfil da empresa" : "Editar perfil"}</CardTitle>
        <CardDescription>
          {isCompany
            ? "Actualiza os dados públicos da empresa no directório. Alterações ficam visíveis após revisão do cache (até 1h)."
            : "Actualiza os teus dados públicos no directório."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="ex: acme-construcoes"
                maxLength={64}
              />
              <p className="text-xs text-muted-foreground">URL: /profiles/{slug || initialProfile.slug}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+258 82 123 4567" maxLength={32} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: Construímos com confiança há 12 anos" maxLength={160} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que a empresa faz, diferenciais, anos de actividade…"
                rows={4}
                maxLength={5000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" maxLength={32} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="geral@empresa.co.mz" maxLength={255} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={255} />
            </div>

            <div className="space-y-2">
              <Label>Logótipo</Label>
              <div className="flex items-center gap-3 rounded-lg border border-input bg-[#F6F3EE]/50 p-3">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-input bg-white flex items-center justify-center">
                  {logoPreview || logoUrl ? (
                    <Image src={logoPreview ?? logoUrl} alt="Logótipo" fill sizes="56px" className="object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground">LOGO</span>
                  )}
                  {logoUploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" /></span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted has-[:disabled]:opacity-50">
                    {logoUploading ? "A carregar…" : "Carregar imagem"}
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={logoUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, "logo", setLogoUrl, setLogoPreview, setLogoUploading); e.target.value = "" }} />
                  </label>
                  {(logoPreview || logoUrl) && (
                    <button type="button" onClick={() => { if (logoPreview) URL.revokeObjectURL(logoPreview); setLogoPreview(null); setLogoUrl(""); }} className="rounded-full border border-destructive/20 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <Input id="logoUrl" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... (ou carrega acima)" maxLength={512} />
              <p className="text-xs text-muted-foreground">PNG/JPG/WebP até 5 MB. Ideal 512×512.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Capa</Label>
              <div className="overflow-hidden rounded-lg border border-input bg-[#F6F3EE]/50">
                <div className="relative h-28 w-full bg-white flex items-center justify-center overflow-hidden">
                  {coverPreview || coverUrl ? (
                    <Image src={coverPreview ?? coverUrl} alt="Capa" fill className="object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">Sem capa — 1200×400 recomendado</span>
                  )}
                  {coverUploading && <span className="absolute inset-0 grid place-items-center bg-white/70"><span className="size-5 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" /></span>}
                </div>
                <div className="flex flex-wrap gap-2 p-3">
                  <label className="inline-flex cursor-pointer rounded-full border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    {coverUploading ? "A carregar…" : "Carregar capa"}
                    <input type="file" accept="image/*" className="hidden" disabled={coverUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f, "generic", setCoverUrl, setCoverPreview, setCoverUploading); e.target.value = "" }} />
                  </label>
                  {(coverPreview || coverUrl) && (
                    <button type="button" onClick={() => { if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverPreview(null); setCoverUrl(""); }} className="rounded-full border border-destructive/20 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
                      Remover
                    </button>
                  )}
                </div>
              </div>
              <Input id="coverUrl" type="url" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://... (ou carrega acima)" maxLength={512} />
            </div>
          </div>

          {isCompany && (
            <div className="space-y-4 rounded-lg border border-input bg-[#F6F3EE]/30 p-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F1A2E]">Qualificação IPEME</h3>
                <p className="text-xs text-muted-foreground">Porte, NUIT e licenças — define selo e elegibilidade para oportunidades.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workers">Nº Trabalhadores *</Label>
                  <Input id="workers" type="number" value={workers} onChange={(e) => setWorkers(e.target.value)} placeholder="Ex: 12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="turnover">Volume anual (MZN)</Label>
                  <Input id="turnover" value={turnover} onChange={(e) => setTurnover(e.target.value)} placeholder="Ex: 4800000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="foundedYear">Ano fundação</Label>
                  <Input id="foundedYear" type="number" value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="Ex: 2018" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalForm">Forma jurídica</Label>
                  <select id="legalForm" value={legalForm} onChange={(e) => setLegalForm(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Seleccionar…</option>
                    <option value="lda">Lda</option>
                    <option value="su">SU</option>
                    <option value="unipessoal">Unipessoal</option>
                    <option value="cooperativa">Cooperativa</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nuit">NUIT (9 dígitos)</Label>
                  <Input id="nuit" value={nuit} onChange={(e) => setNuit(e.target.value)} placeholder="123456789" maxLength={9} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alvara">Alvará</Label>
                  <Input id="alvara" value={alvara} onChange={(e) => setAlvara(e.target.value)} placeholder="Ex: 123/2024" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capital">Capital social (MZN)</Label>
                  <Input id="capital" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="Opcional" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="licenses">Licenças (vírgula)</Label>
                  <Input id="licenses" value={licenses} onChange={(e) => setLicenses(e.target.value)} placeholder="Ex: ISO 9001, Alvará 123" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Áreas de actuação ({selectedCats.length}/5)</Label>
            <p className="text-xs text-muted-foreground">Escolhe até 5 categorias. Define onde apareces no directório.</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = selectedCats.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                    aria-pressed={active}
                  >
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              {success}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "A guardar…" : "Guardar alterações"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
