export type DayPoint = { date: string; label: string; visitas: number; unicos: number }
export type OriginPoint = { origin: string; value: number; fill: string }
export type SizePoint = { size: string; value: number; fill: string }
export type ProvincePoint = { province: string; value: number }
export type VisitorRow = {
  id: string
  name: string
  company: string
  size: string
  origin: string
  province: string
  action: string
  time: string
  avatar: string
}

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return Math.abs(h)
}

export function generateOrgAnalytics(orgId: string, orgName?: string) {
  const h = hashStr(orgId + (orgName ?? ""))
  const rand = (n: number) => {
    const x = Math.sin(h + n * 999) * 10000
    return x - Math.floor(x)
  }

  const today = new Date()
  const days: DayPoint[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    const trend = Math.sin((90 - i) / 14) * 6
    const base = 14 + (h % 18) + trend
    const weekdayBoost = [0, 1, 2, 3, 4].includes(d.getDay()) ? 4 : -3
    const visitas = Math.max(3, Math.round(base + weekdayBoost + rand(i) * 10 - 2))
    const unicos = Math.max(2, Math.round(visitas * (0.62 + rand(i + 500) * 0.18)))
    days.push({ date: d.toISOString().slice(0, 10), label, visitas, unicos })
  }

  const originsBase = [
    { origin: "Pesquisa", pct: 32 + (h % 12) },
    { origin: "Perto de mim", pct: 22 + (h % 10) },
    { origin: "Directo", pct: 18 + (h % 8) },
    { origin: "Partilha", pct: 14 + (h % 7) },
  ]
  const sum = originsBase.reduce((a, b) => a + b.pct, 0)
  const ink = "#0F1A2E"
  const forest = "#0B5E56"
  const signal = "#FF3B1F"
  const origins: OriginPoint[] = originsBase.map((o, i) => ({
    origin: o.origin,
    value: Math.round((o.pct / sum) * 100),
    fill: [forest, ink, "#7A8A9E", signal][i]!,
  }))
  const oSum = origins.reduce((a, b) => a + b.value, 0)
  origins[0]!.value += 100 - oSum

  const sizes: SizePoint[] = [
    { size: "Micro", value: 18 + (h % 9), fill: ink },
    { size: "Pequena", value: 28 + (h % 10), fill: forest },
    { size: "Média", value: 22 + (h % 8), fill: "#4A6B7C" },
    { size: "Grande", value: 16 + (h % 8), fill: signal },
  ]
  const sSum = sizes.reduce((a, b) => a + b.value, 0)
  const normSizes = sizes.map((s) => ({ ...s, value: Math.round((s.value / sSum) * 100) }))
  normSizes[1]!.value += 100 - normSizes.reduce((a, b) => a + b.value, 0)

  const provs = ["Cidade de Maputo", "Maputo Província", "Gaza", "Inhambane", "Sofala", "Nampula", "Tete"]
  const provData: ProvincePoint[] = provs.slice(0, 5 + (h % 2)).map((p, i) => ({
    province: p,
    value: Math.round(8 + rand(i + 100) * 28),
  }))

  const companyPool: [string, string][] = [
    ["Construções Luso", "Média"],
    ["AgroMoz Lda", "Pequena"],
    ["TransLogística SA", "Grande"],
    ["Soluções Digitais MZ", "Pequena"],
    ["MozImports", "Micro"],
    ["Energia Austral", "Média"],
    ["Fábrica do Norte", "Grande"],
    ["Consult MZ", "Pequena"],
  ]
  const originsPool = ["Pesquisa", "Perto de mim", "Directo", "Partilha"] as const
  const actionsPool = ["viu perfil", "clicou WhatsApp", "guardou", "pediu contacto"] as const

  const visitors: VisitorRow[] = Array.from({ length: 9 }, (_, i) => {
    const cp = companyPool[(h + i) % companyPool.length]!
    const origin = originsPool[(h + i * 3) % 4]!
    const action = actionsPool[(h + i * 7) % 4]!
    const prov = provs[(h + i * 2) % provs.length]!
    const minsAgo = Math.round(rand(i + 200) * 340 + 8)
    const time = minsAgo < 60 ? `há ${minsAgo} min` : minsAgo < 1440 ? `há ${Math.round(minsAgo / 60)} h` : `há ${Math.round(minsAgo / 1440)} d`
    return {
      id: `v-${i}`,
      name: cp[0]!,
      company: cp[0]!,
      size: cp[1]!,
      origin,
      province: prov,
      action,
      time,
      avatar: cp[0]!.slice(0, 2).toUpperCase(),
    }
  })

  const last30 = days.slice(-30)
  const total30 = last30.reduce((a, b) => a + b.visitas, 0)
  const unicos30 = last30.reduce((a, b) => a + b.unicos, 0)
  const prev30 = days.slice(-60, -30).reduce((a, b) => a + b.visitas, 0)
  const growth = prev30 ? Math.round(((total30 - prev30) / prev30) * 100) : 0

  return { days, origins, sizes: normSizes, provinces: provData, visitors, total30, unicos30, growth }
}

export async function getOrgAnalyticsWithReal(
  orgId: string,
  orgName: string | undefined,
  profileId: string | null,
  token: string | null,
): Promise<ReturnType<typeof generateOrgAnalytics> & { realQuotesCount: number; realQuotes: unknown[] }> {
  const mock = generateOrgAnalytics(orgId, orgName)
  if (!profileId || !token) return { ...mock, realQuotesCount: 0, realQuotes: [] }
  try {
    const { apiFetchWithAuth } = await import("@/lib/api")
    const res = (await apiFetchWithAuth("/api/v1/quotes?limit=20", token, { cache: "no-store" } as RequestInit).catch(() => null)) as unknown as
      | { data?: { items?: unknown[] } | unknown[] }
      | null
    const raw = (res as { data?: unknown })?.data
    const items = Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? [])
    const filtered = Array.isArray(items) ? (items as { targetProfileId?: string }[]).filter((q) => q.targetProfileId === profileId).slice(0, 9) : []
    if (filtered.length === 0) return { ...mock, realQuotesCount: 0, realQuotes: [] }
    // Usa quotes reais para popular visitors (nome → contacto, message → acção)
    const realVisitors = filtered.map((q, i) => {
      const qq = q as { id: string; status: string; createdAt: string; contactName?: string; serviceLabel?: string }
      return {
        id: qq.id,
        name: (qq as { contactName?: string }).contactName ?? `Contacto ${i + 1}`,
        company: (qq as { serviceLabel?: string }).serviceLabel ?? orgName ?? "Pedido",
        size: mock.sizes[i % mock.sizes.length]?.size ?? "Pequena",
        origin: "Pedido",
        province: mock.provinces[i % mock.provinces.length]?.province ?? "Maputo",
        action: qq.status === "pending" ? "pediu contacto" : qq.status,
        time: new Date(qq.createdAt).toLocaleDateString("pt-MZ"),
        avatar: ((qq as { contactName?: string }).contactName ?? "Q").slice(0, 2).toUpperCase(),
      }
    })
    return { ...mock, visitors: realVisitors as typeof mock.visitors, realQuotesCount: filtered.length, realQuotes: filtered }
  } catch {
    return { ...mock, realQuotesCount: 0, realQuotes: [] }
  }
}
