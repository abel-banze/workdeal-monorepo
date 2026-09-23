"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { BellIcon, CheckCheckIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

type InboxItem = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  status: "unread" | "read"
  createdAt: string
}

async function api<T>(path: string, init?: RequestInit): Promise<{ data: T; meta?: { total?: number } }> {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const json = (await res.json().catch(() => null)) as { success: boolean; data: T; meta?: { total?: number } } | null
  if (!res.ok || !json?.success) throw new Error("Falha ao carregar notificações")
  return { data: json.data, meta: json.meta }
}

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return "agora"
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

export function DashboardNotificationsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<InboxItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const refreshCount = useCallback(async () => {
    try {
      const { data } = await api<{ unread: number }>("/api/v1/notifications/unread-count")
      setUnread(data.unread)
    } catch {}
  }, [])

  const [countInit, setCountInit] = useState(false)

  // Contagem inicial sem effect (evita cascading renders; GET idempotente)
  if (!countInit) {
    setCountInit(true)
    void refreshCount()
  }

  async function loadList() {
    setLoading(true)
    try {
      const { data, meta } = await api<InboxItem[]>("/api/v1/notifications?limit=10")
      setItems(data)
      setTotal(meta?.total ?? data.length)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) void loadList()
  }

  async function openItem(item: InboxItem) {
    if (item.status === "unread") {
      try {
        await api(`/api/v1/notifications/${encodeURIComponent(item.id)}/read`, { method: "PATCH" })
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "read" as const } : i)))
        setUnread((u) => Math.max(0, u - 1))
      } catch {}
    }
    setOpen(false)
    if (item.link) router.push(item.link)
  }

  async function markAllRead() {
    try {
      await api("/api/v1/notifications/read-all", { method: "POST" })
      setItems((prev) => prev.map((i) => ({ ...i, status: "read" as const })))
      setUnread(0)
    } catch {}
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E]/60 transition-colors hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/40"
        aria-label={unread > 0 ? `${unread} notificações não lidas` : "Notificações"}
      >
        <span className="relative">
          <BellIcon className="size-4" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-1.5 rounded-full bg-[#FF3B1F]" />
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80 rounded-2xl border-[#E4DED1]/80 bg-white p-1.5 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#E4DED1]/60 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-[#0F1A2E]">Notificações</p>
            <p className="text-[11px] text-[#0F1A2E]/55">{unread > 0 ? `${unread} por ler` : "Tudo em dia"}</p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-[#0B5E56] hover:bg-[#0B5E56]/10"
            >
              <CheckCheckIcon className="size-3.5" aria-hidden /> Marcar lidas
            </button>
          )}
        </div>
        {loading ? (
          <p className="px-4 py-6 text-center text-xs text-[#0F1A2E]/40">A carregar…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-[#0F1A2E]/40">Sem novidades por agora</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => void openItem(item)}
                className="flex cursor-pointer flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left"
              >
                <span className="flex w-full items-center gap-2">
                  {item.status === "unread" && <span className="size-1.5 shrink-0 rounded-full bg-[#FF3B1F]" aria-hidden />}
                  <span className={`flex-1 truncate text-[13px] ${item.status === "unread" ? "font-bold text-[#0F1A2E]" : "font-medium text-[#0F1A2E]/70"}`}>
                    {item.title}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[#0F1A2E]/40">{timeAgo(item.createdAt)}</span>
                </span>
                {item.body ? <span className="line-clamp-2 w-full text-xs text-[#0F1A2E]/55">{item.body}</span> : null}
              </DropdownMenuItem>
            ))}
          </div>
        )}
        {total > items.length ? <DropdownMenuSeparator /> : null}
        <p className="px-4 py-2 text-center font-mono text-[10px] text-[#0F1A2E]/35">
          Propostas · adjudicações · inscrições · mensagens
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
