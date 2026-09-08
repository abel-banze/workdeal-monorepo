import Link from "next/link";
import { listAdminPlans, listAdminSubscriptions } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { SUBSCRIPTION_STATUSES, SUBSCRIPTION_STATUS_LABELS_PT, type SubscriptionListQuery } from "@workdeal/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubscriptionsTable } from "./subscriptions-table";

export const metadata = {
  title: "Subscrições | Workdeal Admin",
};

export interface SubscriptionListItem {
  id: string;
  userId: string;
  organizationId: string | null;
  planId: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  planName: string;
  planSlug: string;
  planPriceMzn: number;
  planInterval: string;
  organizationName: string | null;
  userEmail: string;
  userName: string | null;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; scope?: string; planId?: string; search?: string; page?: string }>;
}) {
  await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const status = sp.status || undefined;
  const scope = sp.scope || undefined;
  const planId = sp.planId || undefined;
  const q = sp.search ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const [res, plansRes] = await Promise.all([
    listAdminSubscriptions({
      status: status as SubscriptionListQuery["status"],
      scope: scope as SubscriptionListQuery["scope"],
      planId,
      search: q || undefined,
      page,
      limit: 20,
    }),
    listAdminPlans({ includeInactive: true, limit: 100 }),
  ]);

  const items = ((res.data as Record<string, unknown>[] | null) ?? []).map((s) => ({
    id: s.id as string,
    userId: s.userId as string,
    organizationId: (s.organizationId ?? null) as string | null,
    planId: s.planId as string,
    status: s.status as string,
    currentPeriodEnd: (s.currentPeriodEnd ?? null) as string | null,
    cancelAt: (s.cancelAt ?? null) as string | null,
    trialEndsAt: (s.trialEndsAt ?? null) as string | null,
    createdAt: s.createdAt as string,
    planName: s.planName as string,
    planSlug: s.planSlug as string,
    planPriceMzn: s.planPriceMzn as number,
    planInterval: s.planInterval as string,
    organizationName: (s.organizationName ?? null) as string | null,
    userEmail: s.userEmail as string,
    userName: (s.userName ?? null) as string | null,
  }));
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const planOptions = ((plansRes.data as Record<string, unknown>[] | null) ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextStatus = overrides.status !== undefined ? overrides.status : status;
    const nextScope = overrides.scope !== undefined ? overrides.scope : scope;
    const nextPlan = overrides.planId !== undefined ? overrides.planId : planId;
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextStatus) params.set("status", nextStatus);
    if (nextScope) params.set("scope", nextScope);
    if (nextPlan) params.set("planId", nextPlan);
    if (nextQ) params.set("search", nextQ);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/subscriptions${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Subscrições</h1>
        <p className="text-sm text-muted-foreground">
          Gestão de subscrições e planos de preços. Filtra por estado, plano e âmbito.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de subscrições ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/subscriptions" className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="status" className="text-xs text-muted-foreground">Estado</label>
              <select
                id="status"
                name="status"
                defaultValue={status ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {SUBSCRIPTION_STATUSES.map((st) => (
                  <option key={st} value={st}>{SUBSCRIPTION_STATUS_LABELS_PT[st]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="scope" className="text-xs text-muted-foreground">Âmbito</label>
              <select
                id="scope"
                name="scope"
                defaultValue={scope ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                <option value="personal">Pessoal</option>
                <option value="organization">Empresa</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="planId" className="text-xs text-muted-foreground">Plano</label>
              <select
                id="planId"
                name="planId"
                defaultValue={planId ?? ""}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todos</option>
                {planOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <input
              name="search"
              defaultValue={q}
              placeholder="Email ou nome"
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <SubscriptionsTable items={items} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} subscrições</span>
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