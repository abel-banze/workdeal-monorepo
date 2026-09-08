import Link from "next/link";
import { listAdminInstitutions } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { InstitutionsList, type InstitutionAdminRowUI } from "./institutions-list";

export const metadata = {
  title: "Instituições | Workdeal Admin",
};

export default async function InstitutionsPage() {
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await listAdminInstitutions({ limit: 500 });
  const institutions = (res.data as { items?: InstitutionAdminRowUI[] } | null)?.items ?? [];
  const total = (res.meta?.total as number | undefined) ?? institutions.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Gestão · Instituições e organizações
          </p>
          <h1
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Instituições
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#0F1A2E]/50">
            Associações, câmaras de comércio, ONG e entidades públicas. Cria, edita, verifica e acompanha as
            membresias que dão estrutura ao directório.
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href="/dashboard/institutions/new">Criar instituição</Link>
          </Button>
        )}
      </div>

      <InstitutionsList institutions={institutions} isAdmin={isAdmin} total={total} />
    </div>
  );
}