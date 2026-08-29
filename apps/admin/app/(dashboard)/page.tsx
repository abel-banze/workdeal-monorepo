import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Utilizadores", value: "—", href: "/dashboard/users" },
  { label: "Organizações", value: "—", href: "/dashboard/organizations" },
  { label: "Perfis", value: "—", href: "/dashboard/profiles" },
  { label: "Tarefas", value: "—", href: "/dashboard/tasks" },
  { label: "Eventos", value: "—", href: "/dashboard/events" },
  { label: "Concursos", value: "—", href: "/dashboard/tenders" },
  { label: "Verificações pendentes", value: "—", href: "/dashboard/verifications" },
];

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Gestão central da plataforma Workdeal.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="text-2xl font-bold">{s.value}</span>
              <Button asChild variant="outline" size="sm">
                <Link href={s.href}>Gerir</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Liga cada card a queries reais em <code>packages/db</code> (ex: <code>count(users)</code>) quando a BD estiver ligada — por agora placeholders para não quebrar build sem env.
      </p>
    </div>
  );
}
