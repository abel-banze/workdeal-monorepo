import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSystemRole } from "@/lib/auth";
import { getCategoryById, listAdminCategories } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "../../category-form";

export const metadata = {
  title: "Editar categoria | Workdeal Admin",
};

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSystemRole("moderator", "admin");
  const { id } = await params;

  const [catRes, allRes] = await Promise.all([
    getCategoryById(id).catch(() => null),
    listAdminCategories({ limit: 100 }).catch(() => ({ data: [] })),
  ]);

  const category = catRes?.data as CategoryData | null;
  if (!category) notFound();

  const allCategories = (allRes.data as { id: string; name: string }[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar: {category.name}</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/categories">← Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados da categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm mode="edit" initial={category} parentOptions={allCategories} />
        </CardContent>
      </Card>
    </div>
  );
}
