import { getAiOverview } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiConfigForm } from "./ai-config-form";
import { AiCredentialsForm } from "./ai-credentials-form";
import type { CredentialSource } from "./ai-credentials-form";

export const metadata = {
  title: "Inteligência Artificial | Workdeal Admin",
};

export default async function AiSettingsPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await getAiOverview();
  const data = (res.data ?? {}) as Record<string, unknown>;
  const providers = ((data.providers as unknown[]) ?? []).map((p) => p as CredentialSource);
  const providerLabels = (data.providerLabels as Record<string, string>) ?? {};
  const agents = ((data.agents as unknown[]) ?? []).map((a) => a as { key: string; featureKey: string; label: string; tier: string });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Inteligência Artificial</h1>
        <p className="text-sm text-muted-foreground">
          Provider activo, modelos por tier, orçamentos e credenciais usados pelos agentes (assistente comercial,
          propostas, respostas e assistente de perfil).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Configuração do motor</CardTitle>
            <CardDescription>
              Define qual provider serve os agentes e com que modelos/orçamentos. Aplica-se a todas as organizações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AiConfigForm
              provider={String(data.activeProvider ?? "mock")}
              envProvider={String(data.envProvider ?? "mock")}
              providerLabels={providerLabels}
              defaultMatrix={(data.defaultMatrix as Record<string, Record<string, string>>) ?? {}}
              savedOverrides={(data.savedOverrides as Record<string, Record<string, string>>) ?? {}}
              budgets={
                (data.budgets as { maxInputTokens: number; maxOutputTokens: number; maxCostUsd: number }) ?? {
                  maxInputTokens: 0,
                  maxOutputTokens: 0,
                  maxCostUsd: 0,
                }
              }
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Credenciais por provider</CardTitle>
          <CardDescription>
            As chaves guardadas na BD são encriptadas (AES-256-GCM) com a chave-mestra do servidor. Quando vazias, o
            motor usa as env vars correspondentes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiCredentialsForm
            providers={providers}
            masterKeyConfigured={Boolean(data.masterKeyConfigured)}
            isAdmin={isAdmin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agentes activos</CardTitle>
          <CardDescription>Reutilizam o mesmo provider/modelos/budgets da configuração acima.</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Agente</th>
                <th className="py-2 pr-4 font-medium">Chave</th>
                <th className="py-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.key} className="border-b last:border-0">
                  <td className="py-2 pr-4">{a.label}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{a.key}</td>
                  <td className="py-2 capitalize">{a.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}