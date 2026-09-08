import { notFound } from "next/navigation";
import { getAdminBadge } from "@/app/actions/admin";
import { requireSystemRole } from "@/lib/auth";
import { BadgeForm } from "../../badge-form";

export const metadata = {
  title: "Editar selo | Workdeal Admin",
};

export default async function EditBadgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSystemRole("admin");

  const res = await getAdminBadge(id);
  if (!res.success || !res.data) notFound();
  const badge = res.data as unknown as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    type: "trust" | "quality" | "activity" | "reputation" | "specialization" | "network" | "performance" | "commercial" | "promotional" | "informational";
    origin: "automatic" | "manual" | "paid";
    criteria: string | null;
    isActive: boolean;
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Selos · Editar</p>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
          {badge.name}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          O slug não pode ser alterado — é usado em filtros e URLs.
        </p>
      </div>
      <BadgeForm mode="edit" initial={badge} />
    </div>
  );
}