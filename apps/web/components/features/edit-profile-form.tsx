"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Briefcase, Phone, FileText, Building2, Image as ImageIcon, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import type { UpdateProfileInput } from "@workdeal/shared"
import { updateProfile } from "@/app/actions/profiles"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@workspace/ui/components/input-group"

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

  // Verificação de contactos (igual ao onboarding)
  const [whatsappInput, setWhatsappInput] = useState("")
  const [whatsappOtp, setWhatsappOtp] = useState<string | null>(null)
  const [whatsappVerifiedAt, setWhatsappVerifiedAt] = useState<Date | null>(null)
  const [whatsappSending, setWhatsappSending] = useState(false)
  const [phoneInput, setPhoneInput] = useState("")
  const [phoneOtp, setPhoneOtp] = useState<string | null>(null)
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<Date | null>(null)
  const [phoneSending, setPhoneSending] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [emailOtp, setEmailOtp] = useState<string | null>(null)
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<Date | null>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [timers, setTimers] = useState<Record<"whatsapp" | "phone" | "email", number | null>>({ whatsapp: null, phone: null, email: null })
  const [timerNow, setTimerNow] = useState(Date.now())
  const catAnchor = useComboboxAnchor()
  const [catQuery, setCatQuery] = useState("")
  const labelCls = "text-xs font-bold tracking-[0.07em] text-[#0F1A2E]/70 uppercase"
  const inputCls = "w-full rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] leading-none text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none transition focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15"
  const fieldErrCls = "text-xs font-medium text-[#7A1A0A]"
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const hasActive = timers.whatsapp != null || timers.phone != null || timers.email != null
    if (!hasActive) return
    const id = setInterval(() => {
      const now = Date.now()
      setTimerNow(now)
      setTimers((prev) => {
        let changed = false
        const next = { ...prev }
        ;(Object.keys(next) as Array<keyof typeof next>).forEach((k) => {
          if (next[k] != null && now >= next[k]!) { next[k] = null; changed = true }
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timers])

  // Se o contacto mudou em relação ao inicial, invalida verificação anterior
  useEffect(() => {
    if (whatsapp.trim() !== (initialProfile.whatsapp ?? "")) setWhatsappVerifiedAt(null)
  }, [whatsapp, initialProfile.whatsapp])
  useEffect(() => {
    if (phone.trim() !== (initialProfile.phone ?? "")) setPhoneVerifiedAt(null)
  }, [phone, initialProfile.phone])
  useEffect(() => {
    if (email.trim() !== (initialProfile.email ?? "")) setEmailVerifiedAt(null)
  }, [email, initialProfile.email])

  function countdownLabel(channel: "whatsapp" | "phone" | "email"): string {
    const endsAt = timers[channel]
    if (!endsAt) return ""
    const secs = Math.max(0, Math.ceil((endsAt - timerNow) / 1000))
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
  }

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

  async function sendOtp(type: "whatsapp" | "phone" | "email") {
    setMsg(null)
    if (type === "whatsapp") {
      if (!whatsapp.trim()) { setError("Preencha o WhatsApp antes de enviar o código."); return }
      setWhatsappSending(true); setError(null)
      try {
        const { sendWhatsappOtp } = await import("@/app/actions/otp")
        const res = await sendWhatsappOtp({ whatsapp: whatsapp.trim() })
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar código." }); return }
        setWhatsappOtp("sent"); setWhatsappInput(""); setMsg({ type: "success", text: "Código enviado! Verifica o teu WhatsApp." }); setTimers((p) => ({ ...p, whatsapp: Date.now() + 60_000 }))
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar WhatsApp" }) }
      finally { setWhatsappSending(false) }
      return
    }
    if (type === "phone") {
      if (!phone.trim()) { setError("Preencha o telefone antes de enviar o código."); return }
      setPhoneSending(true); setError(null)
      try {
        const { sendPhoneOtp } = await import("@/app/actions/otp")
        const res = await sendPhoneOtp({ phone: phone.trim() })
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar SMS." }); return }
        setPhoneOtp("sent"); setPhoneInput(""); setMsg({ type: "success", text: "Código enviado! Verifica o teu SMS." }); setTimers((p) => ({ ...p, phone: Date.now() + 60_000 }))
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar SMS" }) }
      finally { setPhoneSending(false) }
      return
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido para enviar código."); return }
    setEmailSending(true); setError(null)
    try {
      const { sendEmailOtp } = await import("@/app/actions/otp")
      const res = await sendEmailOtp({ email: email.trim() })
      if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Falha ao enviar email." }); return }
      setEmailOtp("sent"); setEmailInput(""); setMsg({ type: "success", text: "Código enviado! Verifica o teu email." }); setTimers((p) => ({ ...p, email: Date.now() + 60_000 }))
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao enviar email" }) }
    finally { setEmailSending(false) }
  }

  async function verifyOtp(type: "whatsapp" | "phone" | "email") {
    setMsg(null)
    if (type === "whatsapp") {
      try {
        const { verifyWhatsappOtp } = await import("@/app/actions/otp")
        const res = await verifyWhatsappOtp({ whatsapp: whatsapp.trim(), code: whatsappInput.trim() })
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Código incorreto." }); return }
        setWhatsappVerifiedAt(new Date()); setWhatsappOtp(null); setTimers((p) => ({ ...p, whatsapp: null })); setMsg({ type: "success", text: "WhatsApp verificado!" })
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar" }) }
      return
    }
    if (type === "phone") {
      if (!phoneInput || phoneInput.length < 6) { setMsg({ type: "error", text: "Introduz os 6 dígitos." }); return }
      try {
        const { verifyPhoneOtp } = await import("@/app/actions/otp")
        const res = await verifyPhoneOtp({ phone: phone.trim(), code: phoneInput.trim() })
        if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Código incorreto." }); return }
        setPhoneVerifiedAt(new Date()); setPhoneOtp(null); setTimers((p) => ({ ...p, phone: null })); setMsg({ type: "success", text: "Telefone verificado!" })
      } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar" }) }
      return
    }
    try {
      const { verifyEmailOtp } = await import("@/app/actions/otp")
      const res = await verifyEmailOtp({ email: email.trim(), code: emailInput.trim() })
      if (!res.ok) { setMsg({ type: "error", text: res.error ?? "Código incorreto." }); return }
      setEmailVerifiedAt(new Date()); setEmailOtp(null); setTimers((p) => ({ ...p, email: null })); setMsg({ type: "success", text: "Email verificado!" })
    } catch (e) { setMsg({ type: "error", text: e instanceof Error ? e.message : "Falha ao verificar" }) }
  }

  // Valida o passo actual; devolve mensagem de erro ou null se válido.
  function validateStep(stepIndex: number): string | null {
    const current = steps[stepIndex]
    if (!current) return null
    if (current.key === "identidade") {
      if (!name.trim() || name.trim().length < 2) return "Nome deve ter pelo menos 2 caracteres"
      if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) return "Slug inválido: apenas minúsculas, números e hífens"
    }
    if (current.key === "contactos") {
      const changedWhatsapp = whatsapp.trim() !== (initialProfile.whatsapp ?? "")
      const changedPhone = phone.trim() !== (initialProfile.phone ?? "")
      const changedEmail = email.trim() !== (initialProfile.email ?? "")
      if (changedWhatsapp && !whatsappVerifiedAt) return "Verifica o WhatsApp com código OTP ou repõe o valor original"
      if (changedPhone && !phoneVerifiedAt) return "Verifica o telefone com código OTP ou repõe o valor original"
      if (changedEmail && !emailVerifiedAt) return "Verifica o email com código OTP ou repõe o valor original"
      if ((whatsapp.trim() || phone.trim() || email.trim()) && !whatsappVerifiedAt && !phoneVerifiedAt && !emailVerifiedAt && (changedWhatsapp || changedPhone || changedEmail)) {
        return "Altera contactos requer verificação OTP de pelo menos um canal"
      }
    }
    if (current.key === "sobre") {
      if (selectedCats.length === 0) return "Escolhe pelo menos 1 categoria"
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

          {/* PASSO 2 — Contactos (com verificação OTP igual ao onboarding) */}
          {step === 1 && (
            <div className="space-y-5">
              {msg && (
                <div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${msg.type === "success" ? "border border-[#0B5E56]/20 bg-[#0B5E56]/10 text-[#0B5E56]" : "border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 text-[#7A1A0A]"}`}>
                  {msg.text}
                </div>
              )}
              {/* WhatsApp */}
              <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
                <label htmlFor="edit-whatsapp" className={labelCls}>WhatsApp</label>
                <div className="mt-1.5 flex gap-2">
                  <InputGroup className="h-11 flex-1 rounded-lg border-[#D9D2C2] bg-[#F6F3EE] has-[[data-slot=input-group-control]:focus-visible]:border-[#0B5E56] has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-[#0B5E56]/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white">
                    <InputGroupAddon align="inline-start" className="border-r border-[#D9D2C2] pl-3">
                      <InputGroupText className="gap-1.5 text-[13px] font-semibold text-[#0F1A2E]/50"><Phone className="size-3.5" /> +258</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput id="edit-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="82 000 0001" className="h-full px-3 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35" />
                  </InputGroup>
                  <button type="button" onClick={() => sendOtp("whatsapp")} disabled={whatsappSending || !!whatsappVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40">
                    {whatsappVerifiedAt ? "✓" : whatsappSending ? "A enviar..." : timers.whatsapp ? "Reenviar" : "Enviar código"}
                  </button>
                </div>
                {whatsappVerifiedAt ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]"><span className="size-1.5 rounded-full bg-[#0B5E56]" /> Verificado</p>
                ) : whatsappOtp ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <InputOTP maxLength={6} value={whatsappInput} onChange={setWhatsappInput} containerClassName="gap-1.5">
                        <InputOTPGroup className="gap-1.5">{[0,1,2].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                        <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                        <InputOTPGroup className="gap-1.5">{[3,4,5].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                      </InputOTP>
                      <button type="button" onClick={() => verifyOtp("whatsapp")} disabled={whatsappInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">Verificar</button>
                    </div>
                    {timers.whatsapp && (<p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/50"><Clock className="size-3" /> Reenviar em {countdownLabel("whatsapp")}</p>)}
                  </div>
                ) : null}
                {fieldErrors.whatsapp && (<p role="alert" className={fieldErrCls}>{fieldErrors.whatsapp}</p>)}
              </div>
              {/* Telefone */}
              <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
                <label htmlFor="edit-phone" className={labelCls}>Telefone</label>
                <div className="mt-1.5 flex gap-2">
                  <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" maxLength={32} className="flex-1 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15" />
                  <button type="button" onClick={() => sendOtp("phone")} disabled={phoneSending || !!phoneVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40">
                    {phoneVerifiedAt ? "✓" : phoneSending ? "A enviar..." : timers.phone ? "Reenviar" : "Enviar código"}
                  </button>
                </div>
                {phoneVerifiedAt ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]"><span className="size-1.5 rounded-full bg-[#0B5E56]" /> Verificado</p>
                ) : phoneOtp ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <InputOTP maxLength={6} value={phoneInput} onChange={setPhoneInput} containerClassName="gap-1.5">
                        <InputOTPGroup className="gap-1.5">{[0,1,2].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                        <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                        <InputOTPGroup className="gap-1.5">{[3,4,5].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                      </InputOTP>
                      <button type="button" onClick={() => verifyOtp("phone")} disabled={phoneInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">Verificar</button>
                    </div>
                    {timers.phone && (<p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/50"><Clock className="size-3" /> Reenviar em {countdownLabel("phone")}</p>)}
                  </div>
                ) : null}
                {fieldErrors.phone && (<p role="alert" className={fieldErrCls}>{fieldErrors.phone}</p>)}
              </div>
              {/* Email */}
              <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4">
                <label htmlFor="edit-email" className={labelCls}>Email</label>
                <div className="mt-1.5 flex gap-2">
                  <Input id="edit-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="geral@empresa.co.mz" maxLength={255} className="flex-1 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2 text-[13px] text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 outline-none focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15" />
                  <button type="button" onClick={() => sendOtp("email")} disabled={emailSending || !!emailVerifiedAt} className="shrink-0 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-4 text-xs font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56] disabled:opacity-40">
                    {emailVerifiedAt ? "✓" : emailSending ? "A enviar..." : timers.email ? "Reenviar" : "Enviar código"}
                  </button>
                </div>
                {emailVerifiedAt ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56]/10 px-3 py-1 text-xs font-medium text-[#0B5E56]"><span className="size-1.5 rounded-full bg-[#0B5E56]" /> Verificado</p>
                ) : emailOtp ? (
                  <div className="mt-3 flex items-center gap-3">
                    <InputOTP maxLength={6} value={emailInput} onChange={setEmailInput} containerClassName="gap-1.5">
                      <InputOTPGroup className="gap-1.5">{[0,1,2].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                      <div className="flex items-center px-1 text-[#0F1A2E]/20">–</div>
                      <InputOTPGroup className="gap-1.5">{[3,4,5].map((i) => (<InputOTPSlot key={i} index={i} className="size-10 rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] text-base font-semibold text-[#0F1A2E] data-[active=true]:border-[#0B5E56] data-[active=true]:ring-2 data-[active=true]:ring-[#0B5E56]/15 data-[active=true]:bg-white" />))}</InputOTPGroup>
                    </InputOTP>
                    <button type="button" onClick={() => verifyOtp("email")} disabled={emailInput.length < 6} className="shrink-0 rounded-lg bg-[#0B5E56] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A4A44] disabled:opacity-40">Verificar</button>
                  </div>
                ) : null}
                {fieldErrors.email && (<p role="alert" className={fieldErrCls}>{fieldErrors.email}</p>)}
                {timers.email && !emailVerifiedAt && !emailOtp && (<p className="flex items-center gap-1.5 text-xs text-[#0F1A2E]/50"><Clock className="size-3" /> Reenviar em {countdownLabel("email")}</p>)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={255} />
              </div>
              {fieldErrors.contacts && (<p role="alert" className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3.5 py-2.5 text-sm font-medium text-[#7A1A0A]">{fieldErrors.contacts}</p>)}
              {msg && (<div className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium ${msg.type === "success" ? "border border-[#0B5E56]/20 bg-[#0B5E56]/10 text-[#0B5E56]" : "border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 text-[#7A1A0A]"}`}>{msg.text}</div>)}
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
                <Combobox multiple value={selectedCats} onValueChange={(val) => { const next = (val as string[]) ?? []; if (next.length <= 5) setSelectedCats(next) }} onInputValueChange={setCatQuery}>
                  <ComboboxChips ref={catAnchor} className="min-h-[38px] rounded-lg border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-1 text-[13px] transition focus-within:border-[#0B5E56] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B5E56]/15">
                    {selectedCats.map((id) => {
                      const cat = categories.find((c) => c.id === id)
                      return (<ComboboxChip key={id} className="bg-[#0B5E56] text-white hover:bg-[#0A4A44]">{cat?.name ?? id}</ComboboxChip>)
                    })}
                    <ComboboxChipsInput placeholder={selectedCats.length === 0 ? "Procurar categoria da empresa…" : selectedCats.length < 5 ? "Adicionar…" : "Limite 5 atingido"} disabled={selectedCats.length >= 5 && !catQuery} className="placeholder:text-[#0F1A2E]/40" />
                  </ComboboxChips>
                  <ComboboxContent anchor={catAnchor} className="z-50">
                    <ComboboxList>
                      {categories
                        .filter((c) => {
                          if (!catQuery) return true
                          return c.name.toLowerCase().includes(catQuery.toLowerCase())
                        })
                        .slice(0, 30)
                        .map((c) => (
                          <ComboboxItem key={c.id} value={c.id} className="data-[selected]:bg-[#0B5E56] data-[selected]:text-white">
                            {c.name}
                          </ComboboxItem>
                        ))}
                    </ComboboxList>
                    <ComboboxEmpty className="px-3 py-6 text-center text-sm text-[#0F1A2E]/50">Nenhuma categoria encontrada.</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
                <p className="text-xs text-[#0F1A2E]/50">{selectedCats.length}/5 seleccionadas{selectedCats.length === 5 ? " • limite atingido" : " • escolhe até 5"} — define onde a empresa aparece no directório</p>
                {fieldErrors.selectedCats && <p role="alert" className={fieldErrCls}>{fieldErrors.selectedCats}</p>}
                {selectedCats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCats.map((id) => {
                      const cat = categories.find((c) => c.id === id)
                      return (
                        <span key={id} className="inline-flex items-center gap-1 rounded-full border border-[#0B5E56]/15 bg-[#0B5E56]/10 px-2.5 py-1 text-xs font-medium text-[#0B5E56]">
                          {cat?.name ?? id}
                          <button type="button" onClick={() => setSelectedCats((prev) => prev.filter((x) => x !== id))} className="ml-1 rounded-full p-0.5 hover:bg-[#0B5E56]/20" aria-label={`Remover ${cat?.name}`}>×</button>
                        </span>
                      )
                    })}
                  </div>
                )}
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
