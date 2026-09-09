import Link from "next/link";
import { listAdminVerifications } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { VERIFICATION_STATUS_LABELS_PT, type AdminVerificationView } from "@workdeal/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VerificationsTable } from "@/components/features/verifications-table";

export const metadata = {
  title: "Verificações | Workdeal Admin",
};

const STATUS_OPTIONS = ["pending", "in_review", "approved", "rejected"] as const;

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const status = sp.status && (STATUS_OPTIONS as readonly string[]).includes(sp.status) ? sp.status : "pending";
  const page = sp.page && Number(sp.page) > 0 ? Number(sp.page) : 1;

  const res = await listAdminVerifications({ status, page, limit: 20 });
  const rows = (res.data as AdminVerificationView[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const buildHref = (overrides: { status?: string; page?: string }) => {
    const params = new URLSearchParams();
    const nextStatus = overrides.status !== undefined ? overrides.status : status;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextStatus !== "pending") params.set("status", nextStatus);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/verifications${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Verificações</h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de verificação de identidade de empresas. Revisa os documentos, o número de Estatutos/BR e o comprovativo do pagamento do plano Workdeal Trust antes de decidir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pedidos ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/verifications" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="page" value="1" />
            <div className="space-y-1">
              <label htmlFor="status" className="text-xs text-muted-foreground">Estado</label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="pending">{VERIFICATION_STATUS_LABELS_PT.pending}</option>
                <option value="in_review">{VERIFICATION_STATUS_LABELS_PT.in_review}</option>
                <option value="approved">{VERIFICATION_STATUS_LABELS_PT.approved}</option>
                <option value="rejected">{VERIFICATION_STATUS_LABELS_PT.rejected}</option>
              </select>
            </div>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <VerificationsTable rows={rows} mode="active" />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} pedidos</span>
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