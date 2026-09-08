import { listAdminUsers } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { RoleManager } from "@/components/features/role-manager";

export const metadata = {
  title: "Papéis e permissões | Workdeal Admin",
};

export default async function UsersRolesPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listAdminUsers({ page: 1, limit: 100 });
  const users = (res.data as Array<{ id: string; name: string; email: string; systemRole: string }> | null) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
          Utilizadores · Acessos
        </p>
        <h1
          className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Papéis e permissões
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Define quem pertence à equipa Workdeal. A mudança aplica-se de imediato ao painel de administração.
        </p>
      </div>

      <RoleManager users={users} actorRole={session.user.systemRole} />
    </div>
  );
}