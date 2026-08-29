import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EventsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Eventos</h1>
      <Card><CardHeader><CardTitle className="text-sm">Gestão</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Lista paginada + publicação/despublicação via Server Action.</CardContent></Card>
    </div>
  );
}
