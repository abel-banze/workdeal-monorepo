import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FeedbackPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">Feedback</h1>
      <p className="text-sm text-muted-foreground">Canal interno para sugestões e bugs da equipa.</p>
      <Card>
        <CardHeader><CardTitle className="text-sm">Enviar feedback</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Formulário ligado a <code>apps/api</code> — lista feedbacks com estado (aberto/em análise/resolvido).
          <div className="mt-4 rounded-md border p-3 text-xs">Integração pendente.</div>
        </CardContent>
      </Card>
    </div>
  );
}
