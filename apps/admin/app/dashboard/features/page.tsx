import { listAdminFlags } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeaturesTable } from "./features-table";
import { EntitlementsIntegrityCard } from "./entitlements-integrity-card";
import { CreateFlagForm } from "./flag-form";

export const metadata = {
  title: "Features | Workdeal Admin",
};

const FLAG_GROUPS = ["free", "trust", "premium", "enterprise", "others"] as const;

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await requireSystemRole("moderator", "admin");
  const sp = await searchParams;
  const group = sp.group && FLAG_GROUPS.includes(sp.group as (typeof FLAG_GROUPS)[number]) ? sp.group : null;
  const isAdmin = session.user.systemRole === "admin";

  const res = await listAdminFlags(group ?? undefined);
  const raw = (((res.data as Array<{ flag?: Record<string, unknown>; overridesCount?: number }> | null) ?? [])).map((item) => item.flag ? { flag: item.flag, overridesCount: item.overridesCount ?? 0 } : null).filter((x): x is { flag: Record<string, unknown>; overridesCount: number } => x !== null);

  const items = raw.map(({ flag, overridesCount }) => ({
    key: flag.key as string,
    name: flag.name as string,
    group: (flag.group ?? null) as string | null,
    defaultEnabled: flag.defaultEnabled as boolean,
    emergencyDisabled: flag.emergencyDisabled as boolean,
    overridesCount,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Features (flags operacionais)</h1>
          <p className="text-sm text-muted-foreground">
            Controlo operacional sobre as features do produto. Um flag só desliga uma feature — nunca a concede — e
            pode ter sobreposições por organização e kill-switch de emergência.
          </p>
        </div>
      </div>

      {isAdmin && <EntitlementsIntegrityCard />}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lista de flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="GET" action="/dashboard/features" className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              Grupo
              <select
                name="group"
                defaultValue={group ?? ""}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {FLAG_GROUPS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm">Filtrar</Button>
            {group && (
              <Button variant="ghost" size="sm" asChild>
                <a href="/dashboard/features">Limpar</a>
              </Button>
            )}
          </form>

          <FeaturesTable items={items} isAdmin={isAdmin} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Novo flag</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateFlagForm />
            <p className="mt-2 text-xs text-muted-foreground">
              A chave tem de existir no catálogo partilhado (packages/shared). Por defeito ligado preserva o comportamento actual.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}