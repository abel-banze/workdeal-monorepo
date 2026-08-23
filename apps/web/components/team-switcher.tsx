"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { ChevronsUpDownIcon, PlusIcon } from "lucide-react"
import { authClient, fetchJwtToken } from "@/lib/auth-client"

export type TeamSwitcherTeam = {
  id?: string
  name: string
  slug?: string
  logo: React.ReactNode
  plan: string
  type?: "personal" | "company"
}

export function TeamSwitcher({
  teams,
}: {
  teams: TeamSwitcherTeam[]
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const params = useParams() as Record<string, string | string[] | undefined>
  const urlOrgId = typeof params.organizationId === "string" ? params.organizationId : undefined
  const [creating, setCreating] = React.useState(false)
  const [createError, setCreateError] = React.useState<string | null>(null)
  const [showCreate, setShowCreate] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newSlug, setNewSlug] = React.useState("")

  // Determina equipa activa a partir da URL (/dashboard/[organizationId]) ou fallback para primeira
  const activeTeam = React.useMemo(() => {
    if (urlOrgId) {
      const found = teams.find((t) => t.id === urlOrgId)
      if (found) return found
    }
    // Sem org na URL -> equipa pessoal se existir, senão primeira
    const personal = teams.find((t) => t.type === "personal")
    return personal ?? teams[0]
  }, [teams, urlOrgId])

  // Sincroniza quando teams muda e urlOrgId inválido -> redirecciona para pessoal
  React.useEffect(() => {
    if (urlOrgId && !teams.some((t) => t.id === urlOrgId)) {
      // org na URL já não existe (removido) -> volta ao dashboard raiz
      router.replace("/dashboard")
    }
  }, [urlOrgId, teams, router])

  if (!activeTeam) {
    return null
  }

  function handleSelect(team: TeamSwitcherTeam) {
    if (team.type === "personal" || team.id === "personal") {
      router.push("/dashboard")
    } else if (team.id) {
      router.push(`/dashboard/${team.id}`)
    }
  }

  async function handleCreate() {
    if (!newName.trim() || newName.trim().length < 2) {
      setCreateError("Nome deve ter pelo menos 2 caracteres")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const slug =
        newSlug.trim() ||
        newName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      const res = await authClient.organization.create({ name: newName.trim(), slug })
      if (res.error) throw new Error(res.error.message ?? "Falha ao criar organização")
      const orgId = (res.data as { id?: string })?.id ?? (res as unknown as { id?: string })?.id
      // Sincroniza JWT httpOnly para o layout server (requireAuth/listUserOrganizations) ver a nova org sem relogin
      try { await fetchJwtToken() } catch {}
      setShowCreate(false)
      setNewName("")
      setNewSlug("")
      if (orgId) {
        router.push(`/dashboard/${orgId}`)
      }
      router.refresh()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Falha ao criar organização")
    } finally {
      setCreating(false)
    }
  }
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="truncate text-xs">{activeTeam.plan}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.id ?? team.name}
                  onClick={() => handleSelect(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  <span className="flex-1 truncate">{team.name}</span>
                  {team.type === "personal" ? (
                    <span className="text-[10px] text-muted-foreground">Pessoal</span>
                  ) : team.type === "company" ? (
                    <span className="text-[10px] text-muted-foreground">Empresa</span>
                  ) : null}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2" onClick={() => setShowCreate((v) => !v)}>
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Criar empresa
                </div>
              </DropdownMenuItem>
              {showCreate && (
                <div className="p-2 space-y-2" onClick={(e) => e.preventDefault()}>
                  <input
                    placeholder="Nome da empresa"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring"
                  />
                  <input
                    placeholder="slug (opcional)"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-ring"
                  />
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <button
                    onClick={handleCreate}
                    disabled={creating}
                    className="w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {creating ? "A criar…" : "Criar e mudar"}
                  </button>
                </div>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
