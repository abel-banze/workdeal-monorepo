import { listAdminUsers } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RoleManager } from "@/components/features/role-manager";

export const metadata = {
  title: "Papéis e permissões | Workdeal Admin",
};

export default async function UsersRolesPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listAdminUsers({ page: 1, limit: 100 });
  const data = res.data as { items: Array<{ id: string; name: string; email: string; systemRole: string }> } | null;
  const users = data?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Papéis e permissões</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alterar papel de sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager users={users} actorRole={session.user.systemRole} />
        </CardContent>
      </Card>
    </div>
  );
}
