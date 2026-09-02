import Link from "next/link";
import { listAdminUsers } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Utilizadores | Workdeal Admin",
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  systemRole: string;
  emailVerified: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  moderator: "Moderador",
  user: "Utilizador",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const role = sp.role as "admin" | "moderator" | "user" | undefined;
  const q = sp.search ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const res = await listAdminUsers({ role, search: q || undefined, page, limit: 20 });
  const items = (res.data as UserRow[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const nextRole = overrides.role !== undefined ? overrides.role : role;
    const nextQ = overrides.search !== undefined ? overrides.search : q;
    const nextPage = overrides.page ?? (page === 1 ? undefined : String(page));
    if (nextRole) params.set("role", nextRole);
    if (nextQ) params.set("search", nextQ);
    if (nextPage) params.set("page", nextPage);
    const s = params.toString();
    return `/dashboard/users${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilizadores</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/users/roles">Gerir papéis</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de utilizadores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/users" className="flex flex-wrap items-center gap-2">
            <input
              name="search"
              defaultValue={q}
              placeholder="Pesquisar por nome ou email"
              className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
            />
            <select name="role" defaultValue={role ?? ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos os papéis</option>
              <option value="admin">Admin</option>
              <option value="moderator">Moderador</option>
              <option value="user">Utilizador</option>
            </select>
            <Button type="submit" size="sm">Filtrar</Button>
          </form>

          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Papel</th>
                  <th className="px-3 py-2 font-medium">Telefone</th>
                  <th className="px-3 py-2 font-medium">Email verificado</th>
                  <th className="px-3 py-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum utilizador encontrado.</td>
                  </tr>
                ) : (
                  items.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{u.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          {ROLE_LABELS[u.systemRole] ?? u.systemRole}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{u.phone ?? "—"}</td>
                      <td className="px-3 py-2">{u.emailVerified ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("pt-MZ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total: {total} utilizadores</span>
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
