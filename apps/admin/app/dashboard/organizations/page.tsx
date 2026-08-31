import Link from "next/link";
import { listAdminOrganizations } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Empresas | Workdeal Admin",
};

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string;
  createdAt: string;
  memberCount: number;
  profileCount: number;
}

interface OrgsApiData {
  items: OrgRow[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_review: "Em análise",
  verified: "Verificada",
  suspended: "Suspensa",
};

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ verificationStatus?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const verificationStatus = sp.verificationStatus as "pending" | "in_review" | "verified" | "suspended" | undefined;
  const q = sp.search ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const res = await listAdminOrganizations({ verificationStatus, search: q || undefined, page, limit: 20 });
  const data = res.data as OrgsApiData | null;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextStatus = overrides.verificationStatus !== undefined ? overrides.verificationStatus : verificationStatus;
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextStatus) params.set("verificationStatus", nextStatus);
    if (nextQ) params.set("search", nextQ);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/organizations${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Empresas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/organizations/pending">Pendentes</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/organizations/members">Membros</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de empresas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/organizations" className="flex flex-wrap items-center gap-2">
            <input
              name="search"
              defaultValue={q}
              placeholder="Pesquisar por nome ou slug"
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select name="verificationStatus" defaultValue={verificationStatus ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos os estados</option>
              <option value="pending">Pendente</option>
              <option value="in_review">Em análise</option>
              <option value="verified">Verificada</option>
              <option value="suspended">Suspensa</option>
            </select>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Membros</th>
                  <th className="px-3 py-2 font-medium">Perfis</th>
                  <th className="px-3 py-2 font-medium">Criada em</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhuma empresa encontrada.</td>
                  </tr>
                ) : (
                  items.map((org) => (
                    <tr key={org.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{org.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{org.slug}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          {STATUS_LABELS[org.verificationStatus] ?? org.verificationStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2">{org.memberCount}</td>
                      <td className="px-3 py-2">{org.profileCount}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("pt-MZ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} empresas</span>
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
