import Link from "next/link";
import { listAdminBadges } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BadgeType, BadgeOrigin } from "@workdeal/shared";
import { BadgeList } from "./badge-list";

export const metadata = {
  title: "Selos | Workdeal Admin",
};

export interface BadgeListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: BadgeType;
  origin: BadgeOrigin;
  criteria: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default async function BadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origin?: string; isActive?: string; page?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const q = sp.q ?? "";
  const origin = sp.origin ?? "";
  const isActive = sp.isActive !== undefined ? sp.isActive : "";
  const page = sp.page ? Number(sp.page) : 1;

  const res = await listAdminBadges({
    q: q || undefined,
    origin: origin || undefined,
    isActive: isActive || undefined,
    page,
    limit: 20,
  });
  const items = (res.data as BadgeListItem[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextQ = overrides.q !== undefined ? overrides.q : q;
    const nextOrigin = overrides.origin !== undefined ? overrides.origin : origin;
    const nextActive = overrides.isActive !== undefined ? overrides.isActive : isActive;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextQ) params.set("q", nextQ);
    if (nextOrigin) params.set("origin", nextOrigin);
    if (nextActive !== undefined) params.set("isActive", nextActive);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/profiles/badges${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Selos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de selos atribuíveis a perfis e instituições. A atribuição a uma instituição é feita no detalhe da mesma.
          </p>
        </div>
        {session.user.systemRole === "admin" && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/profiles/badges/new">+ Novo selo</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de selos ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/profiles/badges" className="flex flex-wrap items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              placeholder="Pesquisar por nome ou slug"
              className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select name="origin" defaultValue={origin} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todas as origens</option>
              <option value="automatic">Automático</option>
              <option value="manual">Manual</option>
              <option value="paid">Pago</option>
            </select>
            <select name="isActive" defaultValue={isActive} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos os estados</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <BadgeList items={items} isAdmin={session.user.systemRole === "admin"} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} selos</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={buildHref({ page: String(Math.max(1, page - 1)) })}>Anterior</Link>
              </Button>
              <span>Página {page} de {totalPages}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href={buildHref({ page: String(Math.min(totalPages, page + 1)) })}>Seguinte</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}