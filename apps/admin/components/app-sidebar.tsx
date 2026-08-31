import * as React from "react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import {
  LayoutDashboardIcon,
  UsersIcon,
  Building2Icon,
  UserSquareIcon,
  ListChecksIcon,
  TagsIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
  FlagIcon,
  SettingsIcon,
} from "lucide-react"
import { NavMain, type NavMainItem } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"

const groups: { label: string; items: NavMainItem[] }[] = [
  {
    label: "Principal",
    items: [
      { title: "Visão geral", url: "/dashboard", icon: <LayoutDashboardIcon /> },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        title: "Utilizadores",
        icon: <UsersIcon />,
        items: [
          { title: "Todos os utilizadores", url: "/dashboard/users" },
          { title: "Convites", url: "/dashboard/users/invites" },
          { title: "Papéis e permissões", url: "/dashboard/users/roles" },
        ],
      },
      {
        title: "Organizações",
        icon: <Building2Icon />,
        items: [
          { title: "Todas", url: "/dashboard/organizations" },
          { title: "Membros", url: "/dashboard/organizations/members" },
          { title: "Pendentes", url: "/dashboard/organizations/pending" },
        ],
      },
      {
        title: "Perfis",
        icon: <UserSquareIcon />,
        items: [
          { title: "Todos os perfis", url: "/dashboard/profiles" },
          { title: "Pendentes", url: "/dashboard/profiles/pending" },
          { title: "Suspensos", url: "/dashboard/profiles/suspended" },
          { title: "Selos", url: "/dashboard/profiles/badges" },
        ],
      },
    ],
  },
  {
    label: "Marketplace",
    items: [
      {
        title: "Tarefas",
        icon: <ListChecksIcon />,
        items: [
          { title: "Todas as tarefas", url: "/dashboard/tasks" },
          { title: "Moderação", url: "/dashboard/tasks/pending" },
          { title: "Propostas", url: "/dashboard/tasks/proposals" },
        ],
      },
      {
        title: "Categorias",
        icon: <TagsIcon />,
        items: [
          { title: "Categorias", url: "/dashboard/categories" },
          { title: "Competências", url: "/dashboard/skills" },
        ],
      },
    ],
  },
  {
    label: "Oportunidades",
    items: [
      {
        title: "Eventos",
        icon: <CalendarDaysIcon />,
        items: [
          { title: "Todos os eventos", url: "/dashboard/events" },
          { title: "Pendentes", url: "/dashboard/events/pending" },
        ],
      },
      {
        title: "Concursos",
        icon: <BriefcaseIcon />,
        items: [
          { title: "Todos os concursos", url: "/dashboard/tenders" },
          { title: "Alertas", url: "/dashboard/tenders/alerts" },
        ],
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        title: "Verificações",
        icon: <ShieldCheckIcon />,
        items: [
          { title: "Pendentes", url: "/dashboard/verifications" },
          { title: "Histórico", url: "/dashboard/verifications/history" },
        ],
      },
      { title: "Moderação", url: "/dashboard/moderation", icon: <ShieldCheckIcon /> },
      { title: "Denúncias", url: "/dashboard/reports", icon: <FlagIcon /> },
      { title: "Configurações", url: "/dashboard/settings", icon: <SettingsIcon /> },
    ],
  },
]

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; role: string }
}) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="font-bold">W</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Workdeal Admin</span>
                <span className="truncate text-xs">Gestão da plataforma</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
