import { getFeatureEntitlementIntegrity } from "@/app/actions/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface IntegrityIssue {
  subscriptionId: string;
  organizationId: string | null;
  organizationName: string | null;
  planSlug: string;
  planName: string;
  status: string;
  featureKey: string;
  featureLabel: string;
  blockReason: string;
  blockLabel: string;
}

interface IntegrityReport {
  generatedAt: string;
  totalGrantingSubscriptions: number;
  totalGrants: number;
  blockedEntitlements: IntegrityIssue[];
  summary: Record<string, number>;
}

const BLOCK_LABELS: Record<string, string> = {
  kill_switch: "Kill-switch",
  default_disabled: "Default desligado",
  org_override_disabled: "Override desligado",
};

export async function EntitlementsIntegrityCard() {
  const res = await getFeatureEntitlementIntegrity();
  const report = (res as { data?: IntegrityReport })?.data;

  if (!report) return null;

  const blockedCount = report.blockedEntitlements.length;
  const healthy = blockedCount === 0;

  return (
    <Card className={healthy ? "border-emerald-300" : "border-red-300"}>
      <CardHeader>
        <CardTitle className="text-sm">Integridade de entitlements</CardTitle>
        <CardDescription>
          Garante o invariante: nenhuma organização com subscrição activa fica sem uma feature que o seu plano concede.
          <br />
          Auditado em {new Date(report.generatedAt).toLocaleString("pt-MZ")} · {report.totalGrantingSubscriptions} subscrições
          activas · {report.totalGrants} grants de plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`rounded-md px-3 py-2 text-sm font-medium ${healthy ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {healthy
            ? "Sem entraves: todas as features concedidas pelos planos activos estão operacionais."
            : `${blockedCount} feature(s) concedida(s) por um plano activo estão bloqueadas por flags.`}
        </div>

        {!healthy && (
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50 text-left font-medium">
                <tr>
                  <th className="px-3 py-2">Organização</th>
                  <th className="px-3 py-2">Plano</th>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {report.blockedEntitlements.map((issue) => (
                  <tr key={`${issue.subscriptionId}-${issue.featureKey}`} className="border-t">
                    <td className="px-3 py-2">{issue.organizationName ?? "(s/ org)"}</td>
                    <td className="px-3 py-2">{issue.planName} ({issue.planSlug})</td>
                    <td className="px-3 py-2 font-medium">
                      {issue.featureLabel} <span className="text-muted-foreground">({issue.featureKey})</span>
                    </td>
                    <td className="px-3 py-2 text-red-700">
                      {BLOCK_LABELS[issue.blockReason] ?? issue.blockReason} — {issue.blockLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!healthy && (
          <p className="text-xs text-muted-foreground">
            Acção recomendada: corrija o flag (ligar default / adicionar override de activação para a organização) para
            devolver a feature às empresas que já a pagam.
          </p>
        )}
      </CardContent>
    </Card>
  );
}