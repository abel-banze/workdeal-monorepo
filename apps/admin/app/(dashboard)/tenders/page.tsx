import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TendersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Concursos</h1>
      <Card><CardHeader><CardTitle className="text-sm">Concursos públicos</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Feed do scraper — revalidate curto (5-10min). Acções: destacar, ocultar, alertas.</CardContent></Card>
    </div>
  );
}
