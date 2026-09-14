import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminFlag } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OverridesManager, type FlagOverrideItem } from "../overrides-manager";
import { EditFlagForm } from "../flag-form";

export const metadata = {
  title: "Flag | Workdeal Admin",
};

export default async function FlagDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";
  const { key } = await params;

  const res = await getAdminFlag(key);
  if (!res.success) notFound();
  const data = res.data as { flag?: Record<string, unknown>; overrides?: Array<Record<string, unknown>> };
  if (!data.flag) notFound();

  const flag = data.flag;
  const overrides: FlagOverrideItem[] = (data.overrides ?? []).map((o) => ({
    organizationId: o.organizationId as string,
    organizationName: (o.organizationName ?? null) as string | null,
    enabled: o.enabled as boolean,
    note: (o.note ?? null) as string | null,
    expiresAt: o.expiresAt ? new Date(o.expiresAt as string).toISOString() : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
            <Link href="/dashboard/features">← Features</Link>
          </Button>
          <h1 className="text-xl font-semibold">{flag.name as string}</h1>
          <code className="text-xs text-muted-foreground">{flag.key as string}</code>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estado global</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Ligado por defeito:</span>{" "}
            <b>{flag.defaultEnabled ? "Sim" : "Não"}</b>
          </div>
          <div>
            <span className="text-muted-foreground">Kill-switch de emergência:</span>{" "}
            <b className={flag.emergencyDisabled ? "text-destructive" : ""}>{flag.emergencyDisabled ? "ACTIVO (desliga tudo)" : "Inactivo"}</b>
          </div>
          <div>
            <span className="text-muted-foreground">Grupo:</span> <b>{(flag.group as string | null) ?? "—"}</b>
          </div>
          <div>
            <span className="text-muted-foreground">Ordem:</span> <b>{flag.sortOrder as number}</b>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Editar flag</CardTitle>
          </CardHeader>
          <CardContent>
            <EditFlagForm
              flag={{
                key,
                name: flag.name as string,
                group: (flag.group ?? null) as string | null,
                sortOrder: flag.sortOrder as number,
                description: (flag.description ?? null) as string | null,
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sobreposições por organização ({overrides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <OverridesManager flagKey={key} overrides={overrides} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}