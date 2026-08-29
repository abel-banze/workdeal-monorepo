import Link from "next/link"
import { requireAuth } from "@/lib/auth"

export type BookmarkedProfile = {
  profileId: string
  createdAt: string
  profile: {
    id: string
    slug: string
    name: string
    tagline: string | null
    logoUrl: string | null
    type: string
    status: string
  }
}

const TABS: { key: string; label: string }[] = [
  { key: "profiles", label: "Perfis" },
  { key: "tenders", label: "Concursos" },
  { key: "tasks", label: "Tarefas" },
  { key: "events", label: "Eventos" },
]

export default async function GuardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { organizationId } = await params
  const { tab } = await searchParams
  await requireAuth()

  const activeTab = TABS.some((t) => t.key === tab) ? tab! : "profiles"

  let bookmarked: BookmarkedProfile[] = []
  if (activeTab === "profiles") {
    try {
      const { apiFetch } = await import("@/lib/api")
      const res = await apiFetch<BookmarkedProfile[]>("/api/v1/bookmarks/me", { cache: "no-store" })
      bookmarked = Array.isArray(res.data) ? res.data : []
    } catch {
      bookmarked = []
    }
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-5 pb-10">
      <div className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-[#0B5E56]">GUARDADOS</p>
        <h1 className="mt-2 text-[22px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
          Os teus guardados
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-[#0F1A2E]/60">
          Perfis, concursos, tarefas e eventos que marcaste para rever mais tarde.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-[16px] border border-[#D9D2C2] bg-white p-2">
        {TABS.map((t) => {
          const active = t.key === activeTab
          return (
            <a
              key={t.key}
              href={`/dashboard/${organizationId}/guards${t.key === "profiles" ? "" : `?tab=${t.key}`}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active ? "bg-[#0F1A2E] text-white" : "text-[#0F1A2E]/60 hover:bg-[#F6F3EE] hover:text-[#0F1A2E]"}`}
            >
              {t.label}
            </a>
          )
        })}
      </div>

      {activeTab === "profiles" &&
        (bookmarked.length === 0 ? (
          <EmptyState message="Ainda não guardaste nenhum perfil. Marca perfis com o ícone de livro em qualquer página da directoria." />
        ) : (
          <div className="grid gap-3">
            {bookmarked.map(({ profileId, profile: p }) => (
              <Link
                key={profileId}
                href={`/profiles/${p.slug}`}
                className="flex items-center gap-3 rounded-[16px] border border-[#D9D2C2] bg-white px-4 py-3 transition-colors hover:border-[#0B5E56]/40"
              >
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt="" className="size-10 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0B5E56] text-sm font-black text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0F1A2E]">{p.name}</p>
                  {p.tagline && <p className="truncate text-xs text-[#0F1A2E]/55">{p.tagline}</p>}
                </div>
                {p.status === "suspended" && (
                  <span className="ml-auto rounded-full bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-bold text-[#0F1A2E]/50">Suspenso</span>
                )}
              </Link>
            ))}
          </div>
        ))}

      {(activeTab === "tenders" || activeTab === "tasks" || activeTab === "events") && (
        <EmptyState
          message={`Ainda não guardaste ${activeTab === "tenders" ? "concursos" : activeTab}. Esta secção fica disponível quando começares a marcar ${activeTab === "tenders" ? "concursos" : "itens"} da plataforma.`}
        />
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[16px] border border-[#D9D2C2] bg-white p-8 text-center">
      <p className="text-sm leading-relaxed text-[#0F1A2E]/55">{message}</p>
    </div>
  )
}