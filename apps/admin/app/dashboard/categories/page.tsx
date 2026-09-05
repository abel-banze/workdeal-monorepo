import Link from "next/link";
import { listAdminCategories } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryList } from "./category-list";

export const metadata = {
  title: "Categorias | Workdeal Admin",
};

export interface CategoryListItem {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string; isActive?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const q = sp.search ?? "";
  const page = sp.page ? Number(sp.page) : 1;
  const isActive = sp.isActive !== undefined ? sp.isActive === "true" : undefined;

  const res = await listAdminCategories({ search: q || undefined, page, limit: 20, isActive });
  const items = (res.data as CategoryListItem[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));
  const isAdmin = session.user.systemRole === "admin";

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    const nextActive = overrides.isActive !== undefined ? overrides.isActive : isActive?.toString();
    if (nextQ) params.set("search", nextQ);
    if (nextPage) params.set("page", nextPage);
    if (nextActive !== undefined) params.set("isActive", nextActive);
    const s = params.toString();
    return `/dashboard/categories${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">
            Gerir as categorias de serviços e empresas. revalidate 1h + revalidateTag ao editar.
          </p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/categories/new">+ Nova categoria</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de categorias ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/categories" className="flex flex-wrap items-center gap-2">
            <input
              name="search"
              defaultValue={q}
              placeholder="Pesquisar por nome"
              className="h-9 w-72 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select
              name="isActive"
              defaultValue={isActive?.toString() ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos os estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <CategoryList items={items} isAdmin={isAdmin} />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} categorias</span>
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
