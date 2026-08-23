"use client"

import * as React from "react"
import { useParams, usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, LayoutDashboardIcon, Building2Icon, StarIcon, BriefcaseIcon } from "lucide-react"

function buildNavMain(activeId: string | null) {
  const base = activeId ? `/dashboard/${activeId}` : "/dashboard"
  return [
    {
      title: "Painel",
      url: base,
      icon: <LayoutDashboardIcon />,
      isActive: true,
    },
    {
      title: "Perfil",
      url: `${base}/profile`,
      icon: <Building2Icon />,
      items: [
        { title: "Visão geral", url: base },
        { title: "Editar perfil", url: `${base}/profile/edit` },
        { title: "Portfólio", url: `${base}/portfolio` },
        { title: "Serviços", url: `${base}/services` },
      ],
    },
    {
      title: "Avaliações (breve)",
      url: "#",
      icon: <StarIcon />,
    },
    {
      title: "Oportunidades",
      url: "#",
      icon: <BriefcaseIcon />,
      items: [
        { title: "Tarefas (breve)", url: "#" },
        { title: "Eventos (breve)", url: "#" },
        { title: "Concursos (breve)", url: "#" },
      ],
    },
    {
      title: "Definições",
      url: "#",
      icon: <Settings2Icon />,
      items: [
        { title: "Conta", url: `${base}/settings` },
        { title: "Equipa", url: `${base}/team` },
        { title: "Verificação", url: `${base}/verification` },
      ],
    },
  ]
}

function buildProjects(activeId: string | null) {
  return [
    { name: "Directório", url: "/", icon: <FrameIcon /> },
    { name: "Explorar (breve)", url: "#", icon: <MapIcon /> },
  ]
}

export type Team = {
  id?: string
  name: string
  slug?: string
  logo: React.ReactNode
  plan: string
  type?: "personal" | "company"
}

export type SidebarUser = {
  name: string
  email: string
  avatar: string
}

export function AppSidebar({
  teams,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  teams?: Team[]
  user?: SidebarUser
}) {
  const params = useParams() as Record<string, string | string[] | undefined>
  const pathname = usePathname()
  const urlOrgId = typeof params.organizationId === "string" ? params.organizationId : null
  // Fallback: tenta extrair /dashboard/<id> do pathname quando params ainda não hidratou
  const activeId = urlOrgId ?? (pathname?.startsWith("/dashboard/") ? pathname.split("/")[2] ?? null : null)
  const isValidActive = activeId && activeId !== "personal" && teams?.some((t) => t.id === activeId) ? activeId : null
  const navMain = buildNavMain(isValidActive)
  const projects = buildProjects(isValidActive)

  const safeUser = user ?? { name: "shadcn", email: "m@example.com", avatar: "/avatars/shadcn.jpg" }
  const safeTeams = teams ?? [
    { id: "personal", name: "Acme Inc", logo: <GalleryVerticalEndIcon />, plan: "Enterprise", type: "personal" as const },
    { id: "company-1", name: "Acme Corp.", logo: <AudioLinesIcon />, plan: "Startup", type: "company" as const },
    { id: "company-2", name: "Evil Corp.", logo: <TerminalIcon />, plan: "Free", type: "company" as const },
  ]
  // O layout já garante equipa pessoal como primeiro item; fallback só para preview isolado
  const effectiveTeams =
    safeTeams.length > 0
      ? safeTeams
      : [
          {
            id: "personal",
            name: safeUser.name ? `${safeUser.name} (Pessoal)` : "Pessoal",
            logo: <GalleryVerticalEndIcon />,
            plan: "Pessoal",
            type: "personal" as const,
          },
        ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={effectiveTeams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={safeUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
