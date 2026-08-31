import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sections = [
  { title: "Perfis", href: "/dashboard/profiles", desc: "Aprovar, suspender, editar perfis de empresas." },
  { title: "Tarefas", href: "/dashboard/tasks", desc: "Moderar tarefas e propostas." },
  { title: "Eventos", href: "/dashboard/events", desc: "Gerir eventos e inscrições." },
  { title: "Concursos", href: "/dashboard/tenders", desc: "Curadoria de concursos públicos (scraper)." },
  { title: "Verificações", href: "/dashboard/verifications", desc: "Aprovar selos e verificações — requer systemRole admin/moderator." },
];

export default async function ProfilesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Perfis</h1>
      <Card><CardHeader><CardTitle className="text-sm">Fila de moderação</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Lista paginada via repository + Server Actions (aprovar/rejeitar).</CardContent></Card>
    </div>
  );
}
