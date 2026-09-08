import { notFound } from "next/navigation";
import { getAdminPlan, listAdminPlans } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanForm, type PlanFormInitial } from "../../plan-form";

export const metadata = {
  title: "Editar plano | Workdeal Admin",
};

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSystemRole("moderator", "admin");
  const { id } = await params;

  const [res, plansRes] = await Promise.all([
    getAdminPlan(id),
    listAdminPlans({ includeInactive: true, limit: 100 }),
  ]);
  if (!res.success || !res.data) notFound();

  const data = res.data as Record<string, unknown>;

  const features = ((data.features as Record<string, unknown>[] | null) ?? []).map((f) => ({
    featureKey: f.featureKey as string,
    featureValue: (f.featureValue ?? null) as string | null,
    label: (f.label ?? null) as string | null,
  }));
  const inheritedFeatures = ((data.inheritedFeatures as Record<string, unknown>[] | null) ?? []).map((f) => ({
    featureKey: f.featureKey as string,
    featureValue: (f.featureValue ?? null) as string | null,
    label: (f.label ?? null) as string | null,
  }));

  const initial: PlanFormInitial = {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    description: (data.description ?? null) as string | null,
    inheritFromPlanId: (data.inheritFromPlanId ?? null) as string | null,
    priceMzn: data.priceMzn as number,
    interval: data.interval as PlanFormInitial["interval"],
    trialDays: data.trialDays as number,
    maxProfiles: (data.maxProfiles ?? null) as number | null,
    maxTeamMembers: (data.maxTeamMembers ?? null) as number | null,
    maxListings: (data.maxListings ?? null) as number | null,
    maxBranches: (data.maxBranches ?? null) as number | null,
    apiAccess: Boolean(data.apiAccess),
    maxApiCallsPerMonth: (data.maxApiCallsPerMonth ?? null) as number | null,
    isPublic: Boolean(data.isPublic),
    isActive: Boolean(data.isActive),
    sortOrder: data.sortOrder as number,
    features,
    inheritedFeatures,
  };

  const options = ((plansRes.data as Record<string, unknown>[] | null) ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Editar plano: {initial.name}</h1>
        <p className="text-sm text-muted-foreground">Alterar detalhes do plano e as suas features próprias.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Detalhes do plano</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanForm mode="edit" initial={initial} planOptions={options} />
        </CardContent>
      </Card>
    </div>
  );
}