import Link from "next/link";
import { listAdminPlans } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { PLAN_INTERVAL_LABELS_PT } from "@workdeal/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlansTable } from "./plans-table";

export const metadata = {
  title: "Planos | Workdeal Admin",
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ includeInactive?: string; page?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const page = sp.page ? Number(sp.page) : 1;
  const includeInactive = sp.includeInactive === "true";

  const res = await listAdminPlans({ includeInactive, page, limit: 50 });
  const items = ((res.data as Record<string, unknown>[] | null) ?? []).map((p) => ({
    id: p.id as string,
    slug: p.slug as string,
    name: p.name as string,
    inheritFromPlanId: (p.inheritFromPlanId ?? null) as string | null,
    priceMzn: p.priceMzn as number,
    interval: p.interval as keyof typeof PLAN_INTERVAL_LABELS_PT,
    trialDays: p.trialDays as number,
    isPublic: p.isPublic as boolean,
    isActive: p.isActive as boolean,
  }));
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const isAdmin = session.user.systemRole === "admin";

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    const nextActive = overrides.includeInactive !== undefined ? overrides.includeInactive : includeInactive ? "true" : undefined;
    if (nextPage) params.set("page", nextPage);
    if (nextActive) params.set("includeInactive", nextActive);
    const s = params.toString();
    return `/dashboard/plans${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground">
            Subscrições e planos de preços (assinaturas). Gerir planos, features e hierarquia de herança.
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/plans/new">+ Novo plano</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de planos ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/plans" className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="includeInactive"
                value="true"
                defaultChecked={includeInactive}
                className="size-4 rounded border-input"
              />
              Incluir inactivos
            </label>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <PlansTable items={items} isAdmin={isAdmin} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} planos</span>
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