import { listAdminInstitutions } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { InstitutionsList, type InstitutionAdminRowUI } from "../institutions-list";

export const metadata = {
  title: "Membresias de instituições | Workdeal Admin",
};

export default async function InstitutionsMembershipsPage() {
  const session = await requireSystemRole("moderator", "admin");
  const res = await listAdminInstitutions({ limit: 500 });
  const all = (res.data as unknown as { items: InstitutionAdminRowUI[] } | null)?.items ?? [];
  const institutions = all.filter((it) => it.membersCount > 0 || it.verifiedMembersCount > 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Instituições · Membresias</p>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
          Membresias de instituições
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Instituições com empresas membros. Abre o detalhe para aprovar, rejeitar ou verificar as associações.
        </p>
      </div>
      <InstitutionsList institutions={institutions} isAdmin={session.user.systemRole === "admin"} />
    </div>
  );
}