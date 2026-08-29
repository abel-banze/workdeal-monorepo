import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
function Stub({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{desc}</CardContent></Card>
    </div>
  );
}
export default function Page(){ return <Stub title="Convites" desc="Gestão de convites de utilizadores — lista + Server Action para reenviar/revogar." />; }
