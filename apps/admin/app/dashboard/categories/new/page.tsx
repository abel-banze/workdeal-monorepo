import Link from "next/link";
import { requireSystemRole } from "@/lib/auth";
import { listAdminCategories } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "../category-form";

export const metadata = {
  title: "Nova categoria | Workdeal Admin",
};

export default async function CategoryNewPage() {
  await requireSystemRole("moderator", "admin");

  const res = await listAdminCategories({ limit: 100 }).catch(() => ({ data: [] }));
  const allCategories = (res.data as { id: string; name: string }[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Nova categoria</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/categories">← Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados da categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm mode="create" parentOptions={allCategories} />
        </CardContent>
      </Card>
    </div>
  );
}
