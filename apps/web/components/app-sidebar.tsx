"use client"

import * as React from "react"
import { useParams, usePathname } from "next/navigation"

import { NavMain, type NavMainItem } from "@/components/nav-main"
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
import { GalleryVerticalEndIcon, Settings2Icon, LayoutDashboardIcon, Building2Icon, ListChecksIcon, BriefcaseIcon, CalendarDaysIcon, BookmarkIcon, FrameIcon } from "lucide-react"

function buildNavGroups(activeId: string | null) {
  const base = activeId ? `/dashboard/${activeId}` : "/dashboard"
  const menu: NavMainItem[] = [
    {
      title: "Painel",
      url: base,
      icon: <LayoutDashboardIcon />,
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
      title: "Guardados",
      url: `${base}/guards`,
      icon: <BookmarkIcon />,
      items: [
        { title: "Perfis", url: `${base}/guards?tab=profiles` },
        { title: "Concursos", url: `${base}/guards?tab=tenders` },
        { title: "Tarefas", url: `${base}/guards?tab=tasks` },
        { title: "Eventos", url: `${base}/guards?tab=events` },
      ],
    },
    {
      title: "Definições",
      url: `${base}/settings`,
      icon: <Settings2Icon />,
      items: [
        { title: "Conta", url: `${base}/settings` },
        { title: "Equipa", url: `${base}/team` },
        { title: "Verificação", url: `${base}/verification` },
      ],
    },
  ]

  const operacao: NavMainItem[] = [
    {
      title: "Tarefas",
      url: `${base}/tasks`,
      icon: <ListChecksIcon />,
      items: [
        { title: "Todas", url: `${base}/tasks` },
        { title: "Aceitando propostas", url: `${base}/tasks?status=open` },
        { title: "Em execução", url: `${base}/tasks?status=in_progress` },
        { title: "Concluídas", url: `${base}/tasks?status=completed` },
      ],
    },
    {
      title: "Oportunidades",
      url: `${base}/opportunities`,
      icon: <BriefcaseIcon />,
      items: [
        { title: "Propostas enviadas", url: `${base}/opportunities` },
        { title: "Adjudicações ganhas", url: `${base}/opportunities?tab=bids` },
      ],
    },
    {
      title: "Eventos",
      url: `${base}/events`,
      icon: <CalendarDaysIcon />,
      items: [
        { title: "Todos", url: `${base}/events` },
        { title: "Publicados", url: `${base}/events?status=published` },
        { title: "Rascunhos", url: `${base}/events?status=draft` },
      ],
    },
  ]

  return [
    { label: "Menu", items: menu },
    { label: "Operação", items: operacao },
  ]
}

function buildProjects() {
  return [
    { name: "Página inicial", url: "/", icon: <FrameIcon /> },
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
  const navGroups = buildNavGroups(isValidActive)
  const projects = buildProjects()

  const safeUser = user ?? { name: "Utilizador", email: "dev@workdeal.co.mz", avatar: "" }
  const safeTeams = teams ?? [
    { id: "personal", name: "Pessoal", logo: <GalleryVerticalEndIcon />, plan: "Pessoal", type: "personal" as const },
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
        <NavMain groups={navGroups} />
        <NavProjects projects={projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={safeUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}