import { notFound } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { EditProfileForm } from "@/components/features/edit-profile-form"

type ProfileData = {
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

type CategoryRaw = { id: string; slug: string; name: string }

export default async function EditPersonalProfilePage() {
  await requireAuth()

  let profile: ProfileData | null = null
  let categories: CategoryRaw[] = []

  try {
    const { apiFetch } = await import("@/lib/api")
    const [profileRes, catsRes] = await Promise.all([
      apiFetch<ProfileData | null>("/api/v1/profiles/me", { cache: "no-store" }).then((r) => r.data ?? null).catch(() => null),
      apiFetch<CategoryRaw[]>("/api/v1/categories", { cache: "no-store" }).then((r) => r.data ?? []).catch(() => [] as CategoryRaw[]),
    ])

    profile = profileRes
    categories = catsRes.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))
  } catch {
    // fallthrough
  }

  if (!profile) {
    return (
      <section className="mx-auto max-w-[760px] py-2">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0F1A2E]/10 bg-white px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/60 shadow-sm">
          <span className="size-1.5 rounded-full bg-[#FF3B1F]" />
          PERFIL PROFISSIONAL • SEM PERFIL
        </div>
        <div className="overflow-hidden rounded-[24px] border border-[#D9D2C2] bg-white shadow-[0_12px_40px_rgba(15,26,46,0.08)]">
          <div className="relative overflow-hidden bg-[#0F1A2E] px-6 py-8 sm:px-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
                backgroundSize: "48px 48px",
              }}
            />
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[280px] rounded-full bg-[#FF3B1F]/20 blur-[40px]" />
            <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 size-[240px] rounded-full bg-[#0B5E56]/20 blur-[40px]" />
            <div className="relative">
              <h1 className="text-[28px] font-black leading-[0.9] tracking-[-0.05em] text-white sm:text-[32px]" style={{ fontFamily: "var(--font-display)" }}>
                Ainda sem
                <br />
                <span className="font-light text-white/85">perfil profissional.</span>
              </h1>
              <p className="mt-3 max-w-[480px] text-[15px] leading-relaxed text-white/60">
                Crie o seu perfil em <span className="font-semibold text-white">3 minutos</span> e entre para o ecossistema onde os negócios se encontram — visibilidade, confiança e contactos directos.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                <span className="size-1.5 rounded-full bg-[#0B5E56] animate-pulse" />
                Sem fidelização • 100% digital
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 sm:p-8">
            <div className="flex gap-3 rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-xs font-bold text-white">◈</span>
              <div>
                <p className="text-sm font-bold text-[#0F1A2E]">Visibilidade que traz contactos</p>
                <p className="text-xs leading-relaxed text-[#0F1A2E]/60">Apareça para quem procura a sua especialidade e fale directo por WhatsApp.</p>
              </div>
            </div>

            <div className="relative flex items-center gap-3 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-xs font-bold text-white">VO</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold leading-none text-[#0F1A2E]">O seu nome</p>
                <p className="text-xs text-[#0F1A2E]/50">Pré-visualização no directório</p>
              </div>
              <span className="rounded-full border border-[#D9D2C2] bg-white px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#0F1A2E]/50">RASCUNHO</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#D9D2C2] bg-[#F6F3EE]/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs font-medium text-[#0F1A2E]/50">Leva menos de 3 minutos. Pode editar tudo depois.</p>
            <div className="flex gap-2">
              <a href="/dashboard" className="inline-flex h-10 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-5 text-sm font-semibold text-[#0F1A2E] hover:bg-[#0F1A2E] hover:text-white hover:border-[#0F1A2E] transition-colors">
                Voltar
              </a>
              <a href="/onboarding" className="inline-flex h-10 items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors">
                Criar perfil agora →
              </a>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Editar perfil</h1>
        <p className="text-sm text-muted-foreground">
          Perfil:{" "}
          <a href={`/profiles/${profile.slug}`} className="underline">
            /profiles/{profile.slug}
          </a>
        </p>
      </div>
      <EditProfileForm initialProfile={profile} categories={categories} />
    </section>
  )
}
