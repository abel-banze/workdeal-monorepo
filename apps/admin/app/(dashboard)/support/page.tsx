import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-semibold">Suporte</h1>
      <p className="text-sm text-muted-foreground">Base de conhecimento e contacto com a equipa técnica.</p>
      <Card>
        <CardHeader><CardTitle className="text-sm">Canais</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Email: suporte@workdeal.mz · WhatsApp: via Coolify env <code>WHATSAPP_API_TOKEN</code></p>
          <div className="rounded-md border p-3 text-xs">FAQ + tickets pendentes (ligar a service de suporte).</div>
        </CardContent>
      </Card>
    </div>
  );
}
