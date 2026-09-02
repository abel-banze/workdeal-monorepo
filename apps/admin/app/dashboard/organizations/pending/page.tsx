import { listAdminOrganizations } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgStatusManager } from "@/components/features/org-status-manager";

export const metadata = {
  title: "Empresas pendentes | Workdeal Admin",
};

export default async function OrganizationsPendingPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listAdminOrganizations({ verificationStatus: "pending", page: 1, limit: 100 });
  const orgs = (res.data as Array<{ id: string; name: string; slug: string; verificationStatus: string }> | null) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Empresas pendentes</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Verificação de empresas</CardTitle>
        </CardHeader>
        <CardContent>
          {orgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Não há empresas pendentes de verificação.</p>
          ) : (
            <OrgStatusManager orgs={orgs} actorRole={session.user.systemRole} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
