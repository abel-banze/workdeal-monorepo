import { notFound } from "next/navigation";
import { getAdminInstitution } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { InstitutionForm, type InstitutionFormInitial } from "../../institution-form";
import type { InstitutionAdminRow } from "@workdeal/shared";

export const metadata = {
  title: "Editar instituição | Workdeal Admin",
};

function toInitial(row: InstitutionAdminRow): InstitutionFormInitial {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    organizationType: row.organizationType,
    status: row.status,
    legalName: row.legalName,
    website: row.website ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    whatsapp: row.whatsapp ?? null,
    province: row.province,
    district: row.district ?? null,
    city: row.city,
    address: row.address ?? null,
    foundedAt: row.foundedAt ? new Date(row.foundedAt).toISOString() : null,
    logoUrl: row.logoUrl,
    coverUrl: row.coverUrl ?? null,
    tagline: row.tagline ?? null,
    description: row.description ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    acronym: row.acronym ?? null,
    taxId: row.taxId ?? null,
    mission: row.mission ?? null,
    vision: row.vision ?? null,
    operatingScope: row.operatingScope ?? null,
    socialLinks: row.socialLinks
      ? {
          facebook: row.socialLinks.facebook ?? "",
          instagram: row.socialLinks.instagram ?? "",
          linkedin: row.socialLinks.linkedin ?? "",
          youtube: row.socialLinks.youtube ?? "",
          x: row.socialLinks.x ?? "",
          tiktok: row.socialLinks.tiktok ?? "",
        }
      : null,
    primaryContact: row.primaryContact
      ? {
          name: row.primaryContact.name ?? "",
          role: row.primaryContact.role ?? "",
          email: row.primaryContact.email ?? "",
          phone: row.primaryContact.phone ?? "",
        }
      : null,
  };
}

export default async function EditInstitutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSystemRole("admin");

  const res = await getAdminInstitution(id);
  if (!res.success || !res.data) notFound();
  const row = res.data as unknown as InstitutionAdminRow;
  const initial = toInitial(row);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Instituições · Editar</p>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
          {initial.name}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Actualiza os dados da instituição. As alterações ficam visíveis no directório após publicação.
        </p>
      </div>
      <InstitutionForm mode="edit" initial={initial} />
    </div>
  );
}