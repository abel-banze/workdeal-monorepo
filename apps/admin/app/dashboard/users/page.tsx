import Link from "next/link";
import { listAdminUsers } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UsersList, type UserRow } from "./users-list";

export const metadata = {
  title: "Utilizadores | Workdeal Admin",
};

export default async function UsersPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await listAdminUsers({ limit: 500 });
  const users = (res.data as UserRow[] | null) ?? [];
  const total = (res.meta?.total as number) ?? users.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Utilizadores · Base de contas
          </p>
          <h1
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Utilizadores
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
            Todas as contas da plataforma, com o papel de sistema e o estado do email. Pesquisa, filtra e ordena em tempo
            real — e altera papéis directamente da lista.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/users/roles">Gerir papéis</Link>
        </Button>
      </div>

      <UsersList users={users} isAdmin={isAdmin} total={total} />
    </div>
  );
}