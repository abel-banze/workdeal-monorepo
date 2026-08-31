import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function VerificationsPage() {
  // TODO: requireSystemRole("admin","moderator") quando auth estiver ligado à BD
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Verificações</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Pendentes</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Aprovação de selos e verificações — acesso restrito a <code>systemRole: admin/moderator</code>.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled>Aprovar</Button>
            <Button size="sm" variant="ghost" disabled>Rejeitar</Button>
          </div>
          <div className="rounded-md border p-3 text-xs">Ligar a service de verificações + AppError handling.</div>
        </CardContent>
      </Card>
    </div>
  );
}
