import { listPreRegisteredCompanies } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PreRegisterForm } from "./pre-register-form";
import { PreRegisterList } from "./pre-register-list";

export const metadata = {
  title: "Pré-registo de empresas | Workdeal Admin",
};

export default async function PreRegisterPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listPreRegisteredCompanies({ page: 1, limit: 50 });
  const items = (res.data as PreRegisterListItem[] | null) ?? [];
  const total = (res.meta?.total as number) ?? 0;
  const isAdmin = session.user.systemRole === "admin";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pré-registo de empresas</h1>
        <p className="text-sm text-muted-foreground">
          Regista empresas recolhidas pela equipa (ex: FACIM). A empresa é notificada por email, SMS e WhatsApp para completar o registo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Iniciar pré-registo</CardTitle>
        </CardHeader>
        <CardContent>
          <PreRegisterForm isAdmin={isAdmin} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Empresas pré-registadas ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <PreRegisterList items={items} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}

export interface PreRegisterListItem {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  createdAt: string;
  preRegisteredAt: string | null;
  promoterEmail: string | null;
  completionToken: string | null;
  completionTokenExpiresAt: string | null;
  completionUrl: string | null;
}
