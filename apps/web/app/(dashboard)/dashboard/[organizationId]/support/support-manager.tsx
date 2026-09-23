"use client"

import { useState } from "react"
import {
  createSupportTicket,
  listMySupportTickets,
  getSupportTicket,
  replySupportTicket,
  closeSupportTicket,
  submitFeedback,
  listMyFeedback,
} from "@/app/actions/support"
import {
  SUPPORT_TICKET_STATUS_LABELS_PT,
  SUPPORT_TICKET_CATEGORY_LABELS_PT,
  FEEDBACK_KIND_LABELS_PT,
  FEEDBACK_STATUS_LABELS_PT,
} from "@workdeal/shared"
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import type { TicketListItem, TicketMessage, FeedbackListItem } from "./page"

type SupportTicketCategory = keyof typeof SUPPORT_TICKET_CATEGORY_LABELS_PT
type FeedbackKind = keyof typeof FEEDBACK_KIND_LABELS_PT

const TICKET_CATEGORIES = Object.keys(SUPPORT_TICKET_CATEGORY_LABELS_PT) as SupportTicketCategory[]
const FEEDBACK_KINDS = Object.keys(FEEDBACK_KIND_LABELS_PT) as FeedbackKind[]

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary text-primary-foreground",
  in_progress: "bg-muted text-foreground",
  waiting_user: "border border-border bg-card text-foreground",
  resolved: "bg-primary/10 text-primary",
  closed: "bg-muted text-muted-foreground",
  in_review: "border border-border bg-card text-foreground",
  dismissed: "bg-muted text-muted-foreground",
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-MZ", { dateStyle: "short", timeStyle: "short" })
}

export function SupportManager({
  initialTickets,
  initialFeedbacks,
  organizationId,
  orgName,
  userId,
  initialTab,
  initialTicketId,
}: {
  initialTickets: TicketListItem[]
  initialFeedbacks: FeedbackListItem[]
  organizationId: string | null
  orgName: string
  userId: string
  initialTab: "tickets" | "feedback"
  initialTicketId: string | null
}) {
  const [tab, setTab] = useState<"tickets" | "feedback">(initialTab)
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets)
  const [feedbacks, setFeedbacks] = useState<FeedbackListItem[]>(initialFeedbacks)
  const [lastInitialTickets, setLastInitialTickets] = useState(initialTickets)
  const [lastInitialFeedbacks, setLastInitialFeedbacks] = useState(initialFeedbacks)

  // Sincroniza com o servidor quando os dados frescos chegam (ajuste no render)
  if (initialTickets !== lastInitialTickets) {
    setLastInitialTickets(initialTickets)
    setTickets(initialTickets)
  }
  if (initialFeedbacks !== lastInitialFeedbacks) {
    setLastInitialFeedbacks(initialFeedbacks)
    setFeedbacks(initialFeedbacks)
  }
  const [openTicketId, setOpenTicketId] = useState<string | null>(initialTicketId)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const [newSubject, setNewSubject] = useState("")
  const [newCategory, setNewCategory] = useState<SupportTicketCategory>("outro")
  const [newMessage, setNewMessage] = useState("")
  const [reply, setReply] = useState("")
  const [fbKind, setFbKind] = useState<FeedbackKind>("suggestion")
  const [fbMessage, setFbMessage] = useState("")

  async function openThread(id: string) {
    setOpenTicketId(id)
    setMessages([])
    setLoadingThread(true)
    setError(null)
    try {
      const res = (await getSupportTicket(id)) as unknown as { data: { messages: TicketMessage[] } }
      setMessages(res.data.messages ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar conversa")
    } finally {
      setLoadingThread(false)
    }
  }

  async function refreshTickets() {
    try {
      const res = (await listMySupportTickets({ limit: 50 })) as unknown as { data: TicketListItem[] }
      setTickets(res.data ?? [])
    } catch {}
  }

  async function onCreateTicket(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (newSubject.trim().length < 5) {
      setError("Assunto deve ter pelo menos 5 caracteres")
      return
    }
    if (newMessage.trim().length < 10) {
      setError("Descreve o problema com pelo menos 10 caracteres")
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      const res = (await createSupportTicket({
        organizationId,
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
      })) as unknown as { data: TicketListItem }
      setNewSubject("")
      setNewMessage("")
      setNewCategory("outro")
      await refreshTickets()
      setMsg("Pedido enviado — a equipa responde aqui mesmo.")
      if (res.data?.id) void openThread(res.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar pedido")
    } finally {
      setSaving(false)
    }
  }

  async function onReply(e: React.FormEvent) {
    e.preventDefault()
    if (!openTicketId || saving || reply.trim().length === 0) return
    setSaving(true)
    setError(null)
    try {
      const res = (await replySupportTicket(openTicketId, reply.trim())) as unknown as { data: TicketMessage }
      if (res.data) setMessages((prev) => [...prev, { ...res.data, senderName: null }])
      setReply("")
      await refreshTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao responder")
    } finally {
      setSaving(false)
    }
  }

  async function onClose(id: string) {
    setSaving(true)
    setError(null)
    try {
      await closeSupportTicket(id)
      await refreshTickets()
      setMsg("Pedido fechado.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao fechar")
    } finally {
      setSaving(false)
    }
  }

  async function onFeedback(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (fbMessage.trim().length < 10) {
      setError("Conta-nos um pouco mais (mín. 10 caracteres)")
      return
    }
    setSaving(true)
    setError(null)
    setMsg(null)
    try {
      await submitFeedback({ organizationId, kind: fbKind, message: fbMessage.trim(), page: window.location.pathname })
      setFbMessage("")
      const res = (await listMyFeedback({ limit: 50 })) as unknown as { data: FeedbackListItem[] }
      setFeedbacks(res.data ?? [])
      setMsg("Obrigado pelo feedback — a equipa vai analisar.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar feedback")
    } finally {
      setSaving(false)
    }
  }

  const openTicket = tickets.find((t) => t.id === openTicketId) ?? null
  const threadOpen = openTicket && openTicket.status !== "closed" && openTicket.status !== "resolved"

  const inputCls = "rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground"

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Apoio · {orgName}</p>
          <CardTitle className="text-xl">Ajuda e suporte</CardTitle>
          <CardDescription>
            Fala com a equipa Workdeal ou deixa uma sugestão. Respondemos aqui mesmo e por email.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1.5">
        {(["tickets", "feedback"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setTab(k); setError(null); setMsg(null) }}
            aria-current={tab === k ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            {k === "tickets" ? "Pedidos de suporte" : "Feedback"}
          </button>
        ))}
      </div>

      {msg && <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">{msg}</p>}
      {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {tab === "tickets" ? (
        <div className="space-y-3">
          {!openTicketId ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Novo pedido</CardTitle>
                  <CardDescription>Conta o que se passa — normalmente respondemos no próprio dia útil.</CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                  <form onSubmit={onCreateTicket} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Assunto *" maxLength={160} aria-label="Assunto" className={inputCls} />
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as SupportTicketCategory)} aria-label="Categoria" className={inputCls}>
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>{SUPPORT_TICKET_CATEGORY_LABELS_PT[c]}</option>
                        ))}
                      </select>
                    </div>
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Descreve o problema * (mín. 10 caracteres)" rows={4} aria-label="Descrição do problema" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                    <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                      {saving ? "A enviar…" : "Enviar pedido"}
                    </button>
                  </form>
                </div>
              </Card>

              {tickets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Ainda sem pedidos de suporte.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void openThread(t.id)}
                      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold text-foreground">{t.subject}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground"}`}>
                          {SUPPORT_TICKET_STATUS_LABELS_PT[t.status as keyof typeof SUPPORT_TICKET_STATUS_LABELS_PT] ?? t.status}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {SUPPORT_TICKET_CATEGORY_LABELS_PT[t.category as SupportTicketCategory] ?? t.category} · {t.messageCount} {t.messageCount === 1 ? "mensagem" : "mensagens"} · {fmtDate(t.updatedAt)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-bold text-foreground">{openTicket?.subject ?? "Pedido"}</h3>
                  {openTicket && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {SUPPORT_TICKET_STATUS_LABELS_PT[openTicket.status as keyof typeof SUPPORT_TICKET_STATUS_LABELS_PT] ?? openTicket.status} · actualizado {fmtDate(openTicket.updatedAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {threadOpen && (
                    <button type="button" onClick={() => void onClose(openTicketId)} disabled={saving} className="rounded-full border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">
                      Fechar pedido
                    </button>
                  )}
                  <button type="button" onClick={() => { setOpenTicketId(null); setMessages([]) }} className="rounded-full border px-3.5 py-1.5 text-xs font-semibold hover:bg-muted">
                    Voltar
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {loadingThread ? (
                  <p className="text-xs text-muted-foreground">A carregar conversa…</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderUserId === userId
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-foreground"}`}>
                          {!mine && <p className="mb-0.5 text-[11px] font-bold opacity-70">{m.senderName ?? "Equipa Workdeal"}</p>}
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}>{fmtDate(m.createdAt)}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {threadOpen ? (
                <form onSubmit={onReply} className="mt-3 flex gap-2">
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escreve a tua resposta…" aria-label="Responder" className={`${inputCls} flex-1`} />
                  <button type="submit" disabled={saving || reply.trim().length === 0} className="shrink-0 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                    {saving ? "…" : "Enviar"}
                  </button>
                </form>
              ) : (
                <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Pedido encerrado — abre um novo pedido se precisares.</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Deixa o teu feedback</CardTitle>
              <CardDescription>Sugestões, erros ou elogios — lê tudo a equipa de produto.</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <form onSubmit={onFeedback} className="space-y-3">
                <select value={fbKind} onChange={(e) => setFbKind(e.target.value as FeedbackKind)} aria-label="Tipo de feedback" className={`${inputCls} max-w-[240px]`}>
                  {FEEDBACK_KINDS.map((k) => (
                    <option key={k} value={k}>{FEEDBACK_KIND_LABELS_PT[k]}</option>
                  ))}
                </select>
                <textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} placeholder="Conta-nos * (mín. 10 caracteres)" rows={4} aria-label="Mensagem de feedback" className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-[13px] text-foreground" />
                <button type="submit" disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
                  {saving ? "A enviar…" : "Enviar feedback"}
                </button>
              </form>
            </div>
          </Card>

          {feedbacks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Ainda sem feedback enviado.</p>
          ) : (
            <div className="space-y-3">
              {feedbacks.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">{FEEDBACK_KIND_LABELS_PT[f.kind as FeedbackKind] ?? f.kind}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLES[f.status] ?? "bg-muted text-muted-foreground"}`}>
                      {FEEDBACK_STATUS_LABELS_PT[f.status as keyof typeof FEEDBACK_STATUS_LABELS_PT] ?? f.status}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{fmtDate(f.createdAt)}</span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{f.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
