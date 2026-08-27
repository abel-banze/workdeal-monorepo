"use client"

import { useParams, usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ShieldCheck, Clock3, BadgeCheck, AlertCircle } from "lucide-react"

type VerifRow = { id: string; status: string; profileId: string; createdAt: string }

export function DashboardVerificationButton() {
  const params = useParams() as Record<string, string | string[] | undefined>
  const pathname = usePathname()
  const urlOrgId = typeof params.organizationId === "string" ? params.organizationId : null
  const activeId = urlOrgId ?? (pathname?.startsWith("/dashboard/") ? pathname.split("/")[2] ?? null : null)
  const isCompany = !!activeId && activeId !== "personal"

  const [status, setStatus] = useState<"loading" | "none" | "pending" | "in_review" | "approved" | "rejected">("loading")
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isCompany) {
      setStatus("none")
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/v1/verifications/my", { cache: "no-store" })
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json() as { success: boolean; data: VerifRow[] }
        const rows: VerifRow[] = Array.isArray(json.data) ? json.data : []
        if (cancelled) return
        setCount(rows.length)
        if (rows.length === 0) setStatus("none")
        else {
          const latest = rows[0]!
          const s = latest.status as typeof status
          if (s === "pending" || s === "in_review" || s === "approved" || s === "rejected") setStatus(s)
          else setStatus("none")
        }
      } catch {
        if (!cancelled) setStatus("none")
      }
    }
    load()
    return () => { cancelled = true }
  }, [isCompany, activeId])

  if (!isCompany || !activeId) return null

  const href = `/dashboard/${activeId}/verification`

  if (status === "loading") {
    return <div className="h-8 w-[148px] animate-pulse rounded-full bg-[#D9D2C2]/60" aria-hidden />
  }

  if (status === "approved") {
    return (
      <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0B5E56] px-3.5 text-xs font-bold text-white hover:bg-[#0a4d47] transition-colors">
        <BadgeCheck className="size-3.5" /> Verificada
      </Link>
    )
  }

  if (status === "pending" || status === "in_review") {
    return (
      <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0F1A2E] px-3.5 text-xs font-bold text-white hover:bg-black transition-colors">
        <Clock3 className="size-3.5 animate-pulse" /> {status === "pending" ? "Pendente" : "Em análise"}
      </Link>
    )
  }

  if (status === "rejected") {
    return (
      <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#FF3B1F]/30 bg-[#FF3B1F]/10 px-3.5 text-xs font-bold text-[#7A1A0A] hover:bg-[#FF3B1F]/15 transition-colors">
        <AlertCircle className="size-3.5" /> Rejeitada — Pedir novamente
      </Link>
    )
  }

  // none
  return (
    <Link href={href} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#FF3B1F] px-4 text-xs font-bold text-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors">
      <ShieldCheck className="size-3.5" /> Pedir verificação
    </Link>
  )
}
