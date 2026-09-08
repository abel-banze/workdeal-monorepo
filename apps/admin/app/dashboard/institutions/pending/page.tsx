import { listAdminInstitutions } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InstitutionsList, type InstitutionAdminRowUI } from "../institutions-list";

export const metadata = {
  title: "Instituições pendentes | Workdeal Admin",
};

export default async function InstitutionsPendingPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listAdminInstitutions({ verificationStatus: "pending", limit: 500 });
  const institutions = (res.data as unknown as { items: InstitutionAdminRowUI[] } | null)?.items ?? [];
  const total = (res.meta as { total?: number } | undefined)?.total;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Instituições · Pendentes</p>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
            Instituições pendentes
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
            Instituições ainda sem verificação de identidade. Verifica a documentação antes de confirmar.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/institutions">Ver todas</Link>
        </Button>
      </div>
      <InstitutionsList institutions={institutions} isAdmin={session.user.systemRole === "admin"} total={total} />
    </div>
  );
}