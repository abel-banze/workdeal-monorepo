import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TasksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tarefas</h1>
      <Card><CardHeader><CardTitle className="text-sm">Moderação</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Lista paginada + filtros por estado/categoria. Acções: suspender, destacar.</CardContent></Card>
    </div>
  );
}
