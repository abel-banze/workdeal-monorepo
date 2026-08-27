import { redirect } from "next/navigation"
import { requireAuth } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { UserIcon } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon } from "lucide-react"
import { DashboardVerificationButton } from "@/components/layout/dashboard-verification-button"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth()

  // Team-switcher: sempre mostra perfil pessoal + organizações onde é membro (dinâmico)
  let teams: { id: string; name: string; logo: React.ReactNode; plan: string; slug?: string; type: "personal" | "company" }[] = []
  let allOrgs: { id: string; slug: string; name: string; role: string }[] = []
  try {
    const { listUserOrganizations } = await import("@workdeal/auth/repository")
    const orgs = await listUserOrganizations(session.user.id)
    allOrgs = orgs.map((o) => ({ id: o.id, slug: o.slug, name: o.name, role: o.role }))
    const icons = [GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon]
    const personalTeam = {
      id: "personal",
      name: session.user.name ? `${session.user.name} (Pessoal)` : "Pessoal",
      slug: undefined,
      logo: <UserIcon className="size-4" />,
      plan: "Profissional",
      type: "personal" as const,
    }
    const companyTeams = orgs.map((org, idx) => {
      const Icon = icons[idx % icons.length]!
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: <Icon />,
        plan: org.role.charAt(0).toUpperCase() + org.role.slice(1),
        type: "company" as const,
      }
    })
    teams = [personalTeam, ...companyTeams]
  } catch (e) {
    const debugError = e instanceof Error ? e.message : String(e)
    console.error("[DashboardLayout] listUserOrganizations failed", debugError, e)
    teams = [
      {
        id: "personal",
        name: session.user.name ? `${session.user.name} (Pessoal)` : "Pessoal",
        logo: <UserIcon className="size-4" />,
        plan: "Profissional",
        type: "personal" as const,
      },
    ]
  }

  // Guard P0-1: /profiles/me agora é estritamente pessoal. Se não tem pessoal,
  // verifica se tem pelo menos um perfil de empresa; só então força onboarding.
  // Não bloqueia o render do dashboard se DB/API estiver lento — timeout 2s e paralelo.
  try {
    const { apiFetch } = await import("@/lib/api")
    function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T | null> {
      return Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]) as Promise<T | null>
    }
    const res = await withTimeout(apiFetch<{ id: string } | null>("/api/v1/profiles/me", { cache: "no-store" }))
    if (res && !res.data) {
      if (allOrgs.length === 0) {
        redirect("/onboarding")
      } else if (allOrgs.length > 0) {
        // Paralelo em vez de sequencial N+1 — evita 10s de waterfall quando DB remoto está lento
        const checks = await Promise.all(
          allOrgs.map((org) =>
            withTimeout(apiFetch<{ id: string } | null>(`/api/v1/profiles/${org.slug}`, { cache: "no-store" })).catch(() => null),
          ),
        )
        const hasOrgProfile = checks.some((r) => r?.data?.id)
        if (!hasOrgProfile) redirect("/onboarding")
      }
    }
  } catch {
    // Se API/DB falhar ou timeout, não bloqueia — deixa dashboard mostrar estado (evita 13.8s)
  }
  // Expose debug via header for easy inspection (also visible in UI if needed)
  // console.log also helps via `next dev` logs

  const user = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? "",
  }

  return (
    <SidebarProvider>
      <AppSidebar teams={teams} user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#D9D2C2]/60 bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Painel</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Visão geral</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2 px-4">
            <DashboardVerificationButton />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-5 bg-[#F6F3EE] p-5 pt-2">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
