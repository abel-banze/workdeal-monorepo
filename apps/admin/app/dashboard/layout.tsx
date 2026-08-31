import { requireSystemRole } from "@/lib/auth"
import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSystemRole("moderator", "admin")

  const user = {
    name: session.user.name || "Utilizador",
    email: session.user.email,
    role: session.user.systemRole,
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <DashboardHeader breadcrumb={{ label: "Visão geral", current: "Visão geral" }} />
        <main className="flex flex-1 flex-col gap-5 bg-muted/10 p-5">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
