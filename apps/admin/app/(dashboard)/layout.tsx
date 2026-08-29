import { requireAuth } from "@/lib/auth";
import Link from "next/link";

type SubItem = { href: string; label: string };
type NavItem = { href?: string; label: string; sub?: SubItem[] };
type Group = { title: string; items: NavItem[] };

const groups: Group[] = [
  {
    title: "Principal",
    items: [{ href: "/dashboard", label: "Visão geral" }],
  },
  {
    title: "Gestão",
    items: [
      {
        label: "Utilizadores",
        sub: [
          { href: "/dashboard/users", label: "Todos os utilizadores" },
          { href: "/dashboard/users/invites", label: "Convites" },
          { href: "/dashboard/users/roles", label: "Papéis e permissões" },
        ],
      },
      {
        label: "Organizações",
        sub: [
          { href: "/dashboard/organizations", label: "Todas" },
          { href: "/dashboard/organizations/members", label: "Membros" },
          { href: "/dashboard/organizations/pending", label: "Pendentes" },
        ],
      },
      {
        label: "Perfis",
        sub: [
          { href: "/dashboard/profiles", label: "Todos os perfis" },
          { href: "/dashboard/profiles/pending", label: "Pendentes" },
          { href: "/dashboard/profiles/suspended", label: "Suspensos" },
          { href: "/dashboard/profiles/badges", label: "Selos" },
        ],
      },
    ],
  },
  {
    title: "Marketplace",
    items: [
      {
        label: "Tarefas",
        sub: [
          { href: "/dashboard/tasks", label: "Todas as tarefas" },
          { href: "/dashboard/tasks/pending", label: "Moderação" },
          { href: "/dashboard/tasks/proposals", label: "Propostas" },
        ],
      },
      {
        label: "Categorias",
        sub: [
          { href: "/dashboard/categories", label: "Categorias" },
          { href: "/dashboard/skills", label: "Competências" },
        ],
      },
    ],
  },
  {
    title: "Oportunidades",
    items: [
      {
        label: "Eventos",
        sub: [
          { href: "/dashboard/events", label: "Todos os eventos" },
          { href: "/dashboard/events/pending", label: "Pendentes" },
        ],
      },
      {
        label: "Concursos",
        sub: [
          { href: "/dashboard/tenders", label: "Todos os concursos" },
          { href: "/dashboard/tenders/alerts", label: "Alertas" },
        ],
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        label: "Verificações",
        sub: [
          { href: "/dashboard/verifications", label: "Pendentes" },
          { href: "/dashboard/verifications/history", label: "Histórico" },
        ],
      },
      { href: "/dashboard/moderation", label: "Moderação" },
      { href: "/dashboard/reports", label: "Denúncias" },
      { href: "/dashboard/settings", label: "Configurações" },
    ],
  },
];

const footerLinks = [
  { href: "/dashboard/feedback", label: "Feedback" },
  { href: "/dashboard/support", label: "Suporte" },
];

function NavItem({ item }: { item: NavItem }) {
  if (item.sub) {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground">
          <span>{item.label}</span>
          <span className="text-xs opacity-60 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="ml-2 mt-1 space-y-1 border-l pl-3">
          {item.sub.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </details>
    );
  }
  return (
    <Link
      href={item.href!}
      className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
    >
      {item.label}
    </Link>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-72 border-r bg-muted/20 hidden md:flex flex-col">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            Workdeal Admin
          </Link>
          <p className="text-xs text-muted-foreground">Gestão da plataforma</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-6">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.title}
              </p>
              <div className="space-y-1">
                {g.items.map((it) => (
                  <NavItem key={it.label} item={it} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-3 space-y-1">
          <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ajuda
          </p>
          {footerLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {l.label}
            </Link>
          ))}
          <p className="px-3 pt-2 text-[11px] text-muted-foreground">v1.0 · Workdeal</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 justify-between bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <span className="text-sm text-muted-foreground">Dashboard</span>
          <span className="text-xs text-muted-foreground hidden sm:block">admin@workdeal.mz</span>
        </header>
        <main className="flex-1 p-6 bg-background">{children}</main>
      </div>
    </div>
  );
}
