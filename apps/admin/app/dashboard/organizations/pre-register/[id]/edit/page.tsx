import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSystemRole } from "@/lib/auth";
import { getPreRegisterById, listCategories } from "@/app/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PreRegisterForm } from "../../pre-register-form";
import type { NotifyChannel } from "@workdeal/shared/schemas/pre-register";

export const metadata = {
  title: "Editar pré-registo | Workdeal Admin",
};

interface EditPreRegister {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  formattedAddress: string | null;
  googlePlaceId: string | null;
  logoUrl: string | null;
  categorySlugs: string[];
  notifyChannels?: string[];
}

interface CategoryOption {
  id: string;
  slug: string;
  name: string;
}

export default async function EditPreRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const [res, categoriesRes] = await Promise.all([
    getPreRegisterById(id).catch(() => null),
    listCategories().catch(() => ({ data: [] as CategoryOption[] })),
  ]);
  const data = res?.success ? (res.data as EditPreRegister) : null;
  if (!data) notFound();
  const categories = (categoriesRes.data as CategoryOption[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar pré-registo</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/organizations/pre-register">← Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <PreRegisterForm
            isAdmin={isAdmin}
            categories={categories}
            id={data.id}
            initial={{
              name: data.name,
              slug: data.slug,
              contactName: data.contactName ?? "",
              contactPhone: data.contactPhone ?? "",
              contactEmail: data.contactEmail ?? "",
              formattedAddress: data.formattedAddress ?? "",
              googlePlaceId: data.googlePlaceId ?? "",
              logoUrl: data.logoUrl ?? "",
              categorySlugs: data.categorySlugs,
              notifyChannels: (data.notifyChannels as NotifyChannel[] | undefined) ?? undefined,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
