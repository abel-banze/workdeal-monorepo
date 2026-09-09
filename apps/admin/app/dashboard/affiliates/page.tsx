import { listAdminAffiliates } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AffiliatesFilters } from "@/components/features/affiliates-filters";
import { AffiliateActions } from "@/components/features/affiliate-actions";
import { NewAffiliateDialog } from "@/components/features/new-affiliate-dialog";
import type { AffiliateAdminView } from "@workdeal/shared";
import Link from "next/link";

export const metadata = {
  title: "Afiliados | Workdeal Admin",
};

type AffiliateRow = Omit<AffiliateAdminView, "createdAt"> & { createdAt: string };

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  suspended: "Suspendido",
};

export default async function AffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const sp = await searchParams;
  const q = sp.search ?? "";
  const status = sp.status ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const res = await listAdminAffiliates({
    search: q || undefined,
    status: status === "active" || status === "suspended" ? status : undefined,
    page,
    limit: 20,
  });
  const rows = (res.data as AffiliateRow[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextStatus = overrides.status !== undefined ? overrides.status : status;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextQ) params.set("search", nextQ);
    if (nextStatus) params.set("status", nextStatus);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/affiliates${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Afiliados</h1>
          <p className="text-sm text-muted-foreground">
            Parceiros que indicam empresas para a Workdeal. Ganham comissão quando a empresa indicada paga a primeira factura.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <NewAffiliateDialog />}
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/subscriptions">Ver pagamentos</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de afiliados ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AffiliatesFilters key={[q, status].join("|")} initialSearch={q} initialStatus={status} />

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Comissão</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Indicações</th>
                  <th className="px-3 py-2 font-medium">Conversões</th>
                  <th className="px-3 py-2 font-medium">Pendente</th>
                  <th className="px-3 py-2 font-medium">Pago</th>
                  <th className="px-3 py-2 font-medium">Criado em</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Nenhum afiliado encontrado.</td>
                  </tr>
                ) : (
                  rows.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{a.actorName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{a.actorType === "user" ? "Utilizador" : "Empresa"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border px-2 py-0.5 font-mono text-xs">{a.code}</span>
                      </td>
                      <td className="px-3 py-2">
                        {a.commissionType === "percent" ? `${a.commissionValue}%` : `${a.commissionValue.toLocaleString("pt-MZ")} MZN`}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[a.status] ?? a.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{a.referralsCount}</td>
                      <td className="px-3 py-2">{a.conversions}</td>
                      <td className="px-3 py-2">{(a.pendingMzn || null)?.toLocaleString("pt-MZ") ?? "—"}</td>
                      <td className="px-3 py-2">{(a.paidMzn || null)?.toLocaleString("pt-MZ") ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("pt-MZ")}</td>
                      <td className="px-3 py-2">
                        <AffiliateActions affiliate={a} isAdmin={isAdmin} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} afiliados</span>
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