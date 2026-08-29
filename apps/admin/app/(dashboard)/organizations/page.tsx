import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrganizationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Organizações</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm">Lista</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Gestão de organizações (better-auth organization plugin) — membros, papéis <code>owner/admin/editor/member</code>.
          <div className="mt-4 rounded-md border p-3 text-xs">Ligar a <code>packages/db</code> / <code>@workdeal/auth</code> organization queries.</div>
        </CardContent>
      </Card>
    </div>
  );
}
