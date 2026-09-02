import Link from "next/link";
import { listPreRegisteredCompanies } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreRegisterList } from "./pre-register-list";

export const metadata = {
  title: "Pré-registo de empresas | Workdeal Admin",
};

export interface PreRegisterListItem {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  formattedAddress: string | null;
  logoUrl: string | null;
  categorySlugs: string[];
  createdAt: string;
  preRegisteredAt: string | null;
  promoterEmail: string | null;
  completionToken: string | null;
  completionTokenExpiresAt: string | null;
  completionUrl: string | null;
}

export default async function PreRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const q = sp.search ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const res = await listPreRegisteredCompanies({ search: q || undefined, page, limit: 20 });
  const items = (res.data as PreRegisterListItem[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const isAdmin = session.user.systemRole === "admin";

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextQ) params.set("search", nextQ);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/organizations/pre-register${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pré-registo de empresas</h1>
          <p className="text-sm text-muted-foreground">
            Empresas recolhidas pela equipa (ex: FACIM). A empresa é notificada por email, SMS e WhatsApp para completar o registo.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/organizations/pre-register/new">+ Novo pré-registo</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de pré-registos ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/organizations/pre-register" className="flex flex-wrap items-center gap-2">
            <input
              name="search"
              defaultValue={q}
              placeholder="Pesquisar por nome, contacto ou email"
              className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
            />
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <PreRegisterList items={items} isAdmin={isAdmin} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} pré-registos</span>
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
