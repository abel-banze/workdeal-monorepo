import { listAdminPlans } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm } from "../plan-form";

export const metadata = {
  title: "Novo plano | Workdeal Admin",
};

export default async function NewPlanPage() {
  await requireSystemRole("moderator", "admin");

  const res = await listAdminPlans({ includeInactive: true, limit: 100 });
  const options = ((res.data as Record<string, unknown>[] | null) ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Novo plano</h1>
        <p className="text-sm text-muted-foreground">Criar um plano de subscrição e as suas features.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhes do plano</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm mode="create" planOptions={options} />
        </CardContent>
      </Card>
    </div>
  );
}