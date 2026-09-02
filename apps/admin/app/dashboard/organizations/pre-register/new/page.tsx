import Link from "next/link";
import { requireSystemRole } from "@/lib/auth";
import { listCategories } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreRegisterForm } from "../pre-register-form";

export const metadata = {
  title: "Novo pré-registo | Workdeal Admin",
};

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

export default async function PreRegisterNewPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";
  const res = await listCategories().catch(() => ({ data: [] as CategoryOption[] }));
  const categories = (res.data as CategoryOption[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Novo pré-registo</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/organizations/pre-register">← Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <PreRegisterForm isAdmin={isAdmin} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
