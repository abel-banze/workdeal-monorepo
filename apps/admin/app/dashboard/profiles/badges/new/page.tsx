import { requireSystemRole } from "@/lib/auth";
import { BadgeForm } from "../badge-form";

export const metadata = {
  title: "Novo selo | Workdeal Admin",
};

export default async function NewBadgePage() {
  await requireSystemRole("admin");
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">Selos · Criar</p>
        <h1 className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]" style={{ fontFamily: "var(--font-display)" }}>
          Novo selo
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Define um selo do catálogo. Depois de criado, podes atribuí-lo a instituições no detalhe da instituição.
        </p>
      </div>
      <BadgeForm mode="create" />
    </div>
  );
}