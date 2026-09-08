import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminInstitution, listInstitutionMemberships, listInstitutionBadges, listAdminBadges } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { institutionTypeLabels, type InstitutionAdminRow, type InstitutionMembershipAdminRow, type AssignedBadgeView, type Badge } from "@workdeal/shared";
import { MembershipsManager } from "./memberships";
import { BadgesManager } from "./badges";

export const metadata = {
  title: "Instituição | Workdeal Admin",
};

export default async function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSystemRole("moderator", "admin");
  const isAdmin = session.user.systemRole === "admin";

  const res = await getAdminInstitution(id);
  if (!res.success || !res.data) notFound();
  const institution = res.data as unknown as InstitutionAdminRow;

  const membershipsRes = await listInstitutionMemberships(id, { limit: 500 }).catch(() => null);
  const memberships = ((membershipsRes?.data as { items?: InstitutionMembershipAdminRow[] } | null)?.items ?? []) as unknown as InstitutionMembershipAdminRow[];
  const membershipsTotal = (membershipsRes?.meta?.total as number | undefined) ?? memberships.length;

  const assignedRes = await listInstitutionBadges(id).catch(() => null);
  const assigned = ((assignedRes?.data as AssignedBadgeView[] | null) ?? []) as unknown as AssignedBadgeView[];
  const catalogueRes = await listAdminBadges({ isActive: "true", limit: 100 }).catch(() => null);
  const catalogue = ((catalogueRes?.data as Badge[] | null) ?? []) as unknown as Badge[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Instituições · Detalhe</p>
          <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
            {institution.name}
          </h1>
          <p className="mt-1 text-sm text-[#0F1A2E]/50">
            {institutionTypeLabels[institution.organizationType]} · {institution.slug}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link href={`/dashboard/institutions/${id}/edit`}>Editar</Link>
          </Button>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Estado" value={institution.status} caption={institution.verificationStatus === "verified" ? "Verificada" : `Verificação: ${institution.verificationStatus}`} />
        <InfoCard label="Membresias" value={institution.membersCount} caption={`${institution.verifiedMembersCount} verificadas`} />
        <InfoCard label="Província" value={institution.province ?? "—"} caption={institution.city ?? ""} />
        <InfoCard label="Criada" value={institution.createdAt ? new Date(institution.createdAt).toLocaleDateString("pt-MZ") : "—"} caption={institution.createdByEmail ?? ""} />
      </section>

      <MembershipsManager memberships={memberships} total={membershipsTotal} isAdmin={isAdmin} />

      <BadgesManager institutionId={id} assigned={assigned} catalogue={catalogue} isAdmin={isAdmin} />
    </div>
  );
}

function InfoCard({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <div className="rounded-2xl border border-[#D9D2C2] bg-white p-4 shadow-sm">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/50">{label}</p>
      <p className="mt-2 text-xl font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      {caption ? <p className="mt-0.5 text-xs text-[#0F1A2E]/45">{caption}</p> : null}
    </div>
  );
}