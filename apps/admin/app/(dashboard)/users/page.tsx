import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function UsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilizadores</h1>
        <Button variant="outline" size="sm" disabled>Convidar</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Lista</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Paginação via <code>packages/db</code> — filtra por <code>systemRole</code> (user/moderator/admin). Adiciona Server Action para alterar papel.
          <div className="mt-4 rounded-md border p-3 text-xs">Nenhum utilizador carregado (liga ao repository).</div>
        </CardContent>
      </Card>
    </div>
  );
}
