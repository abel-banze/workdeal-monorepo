"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Briefcase, Phone, FileText, Building2, Image as ImageIcon, Check, ChevronLeft, ChevronRight } from "lucide-react"
import type { UpdateProfileInput } from "@workdeal/shared"
import { updateProfile } from "@/app/actions/profiles"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

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

type StepDef = {
  key: string
  label: string
  eyebrow: string
  hint: string
  Icon: typeof Briefcase
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
  const [step, setStep] = useState(0)

  const steps: StepDef[] = useMemo(() => {
    const base: StepDef[] = [
      { key: "identidade", label: "Identidade", eyebrow: "Passo 1", hint: "Como a empresa se chama e é encontrada.", Icon: Briefcase },
      { key: "contactos", label: "Contactos", eyebrow: "Passo 2", hint: "Como os clientes falam contigo.", Icon: Phone },
      { key: "sobre", label: "Sobre", eyebrow: "Passo 3", hint: "O que fazes e onde apareces no directório.", Icon: FileText },
    ]
    if (isCompany) {
      base.push({ key: "porte", label: "Porte & licenças", eyebrow: "Passo 4", hint: "Dados IPEME: porte, NUIT, alvará e licenças.", Icon: Building2 })
    }
    base.push({ key: "aspecto", label: "Aspecto", eyebrow: isCompany ? "Passo 5" : "Passo 4", hint: "Logótipo e capa do perfil.", Icon: ImageIcon })
    return base
  }, [isCompany])

  const totalSteps = steps.length
  const isLast = step === totalSteps - 1
  const activeStep = (steps[step] ?? steps[steps.length - 1])!

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

  // Valida o passo actual; devolve mensagem de erro ou null se válido.
  function validateStep(stepIndex: number): string | null {
    const current = steps[stepIndex]
    if (!current) return null
    if (current.key === "identidade") {
      if (!name.trim() || name.trim().length < 2) return "Nome deve ter pelo menos 2 caracteres"
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) return "Slug inválido: apenas minúsculas, números e hífens"
    }
    if (current.key === "porte") {
      if (!workers.trim()) return "Nº trabalhadores é obrigatório"
      const w = parseInt(workers.replace(/\D/g, ""), 10)
      if (!Number.isFinite(w) || w < 1) return "Nº trabalhadores deve ser ≥1"
    }
    return null
  }

  function goNext() {
    setError(null)
    const invalid = validateStep(step)
    if (invalid) {
      setError(invalid)
      return
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  function goTo(target: number) {
    // Só deixa saltar para passos já visitados (≤ actual) — os futuros exigem validação em ordem.
    if (target < step) {
      setError(null)
      setStep(target)
      return
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const invalid = validateStep(step)
    if (invalid) {
      setError(invalid)
      return
    }

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
      <CardHeader className="border-b border-[#D9D2C2] bg-[#F6F3EE]/40 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-black tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
              {isCompany ? "Editar perfil da empresa" : "Editar perfil"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {isCompany ? "Actualiza os dados públicos no directório. Alterações ficam visíveis após revisão do cache (até 1h)." : "Actualiza os teus dados públicos no directório."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="hidden shrink-0 sm:inline-flex">
            Cancelar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 sm:p-8">
        {/* Stepper — comunica progresso e completude reais do processo */}
        <ol className="mb-7 flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Progresso do formulário">
          {steps.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={s.key} className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={i > step}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30",
                    active
                      ? "border-[#0B5E56] bg-[#0B5E56] text-white"
                      : done
                        ? "border-[#0B5E56]/25 bg-[#0B5E56]/10 text-[#0B5E56] hover:bg-[#0B5E56]/15"
                        : "border-[#D9D2C2] bg-white text-[#0F1A2E]/45 disabled:cursor-not-allowed disabled:opacity-70"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-black",
                      active
                        ? "bg-white/20 text-white"
                        : done
                          ? "bg-[#0B5E56] text-white"
                          : "bg-[#F6F3EE] text-[#0F1A2E]/45"
                    )}
                  >
                    {done ? <Check className="size-3" aria-hidden /> : i + 1}
                  </span>
                  <span className="hidden text-xs font-semibold sm:inline">{s.label}</span>
                </button>
                {i < totalSteps - 1 ? <span className={cn("h-px w-4 rounded-full", i < step ? "bg-[#0B5E56]/40" : "bg-[#D9D2C2]")} aria-hidden /> : null}
              </li>
            )
          })}
        </ol>

        <div className="mb-5 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE]/50 px-4 py-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">{activeStep.eyebrow} · {activeStep.label}</p>
          <p className="mt-0.5 text-sm text-[#0F1A2E]/70">{activeStep.hint}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* PASSO 1 — Identidade */}
          {step === 0 && (
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
            </div>
          )}

          {/* PASSO 2 — Contactos */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+258 82 123 4567" maxLength={32} />
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
            </div>
          )}

          {/* PASSO 3 — Sobre */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ex: Construímos com confiança há 12 anos" maxLength={160} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que a empresa faz, diferenciais, anos de actividade…"
                  rows={5}
                  maxLength={5000}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
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
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-[#0B5E56] bg-[#0B5E56] text-white" : "border-[#D9D2C2] bg-background text-[#0F1A2E]/80 hover:bg-muted"}`}
                        aria-pressed={active}
                      >
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4 — Porte & licenças (só empresa) */}
          {isCompany && step === 3 && (
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
          )}

          {/* PASSO final — Aspecto */}
          {step === (isCompany ? 4 : 3) && (
            <div className="grid gap-4">
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

              <div className="space-y-2">
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
          )}

          {error && <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {success && (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300">
              {success}
            </p>
          )}

          {/* Navegação */}
          <div className="flex items-center justify-between gap-3 border-t border-[#D9D2C2] pt-5">
            <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || loading}>
              <ChevronLeft className="size-4" aria-hidden /> Anterior
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="sm:hidden">
                Cancelar
              </Button>
              {isLast ? (
                <Button type="submit" disabled={loading} className="bg-[#0B5E56] text-white hover:bg-[#0A4A44]">
                  {loading ? "A guardar…" : "Guardar alterações"}
                </Button>
              ) : (
                <Button type="button" onClick={goNext} className="bg-[#0B5E56] text-white hover:bg-[#0A4A44]">
                  Continuar <ChevronRight className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
