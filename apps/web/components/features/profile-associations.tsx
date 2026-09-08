import Link from "next/link";
import Image from "next/image";
import { getInstitutions } from "@/lib/organizations";
import { institutionTypeLabels } from "@workdeal/shared";

type Props = { companyProfileId: string };

/**
 * Secção "Associações" — instituições a que a empresa pertence (membership
 * aprovada ou verificada). Server Component: dados fetch directo no servidor,
 * filtro via companyProfileId no backend.
 */
export async function ProfileAssociations({ companyProfileId }: Props) {
  let institutions: Awaited<ReturnType<typeof getInstitutions>>["data"] = [];
  try {
    const res = await getInstitutions({ companyProfileId, limit: "8" });
    institutions = res.data ?? [];
  } catch {
    return null;
  }

  if (institutions.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Pertença</p>
          <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
            Associações
          </h2>
        </div>
        <span className="rounded-full bg-[#0B5E56]/10 px-3 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-[#0B5E56]">
          {institutions.length} {institutions.length === 1 ? "instituição" : "instituições"}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {institutions.map((inst) => (
          <li key={inst.id}>
            <Link
              href={`/organizations/${inst.slug}`}
              className="flex items-center gap-3 rounded-2xl border border-[#D9D2C2] p-3 transition-colors hover:border-[#0B5E56]/25 hover:bg-[#F6F3EE]/60"
            >
              <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-[#D9D2C2] bg-[#F6F3EE]">
                {inst.logoUrl ? (
                  <Image src={inst.logoUrl} alt="" fill sizes="36px" className="object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center text-[11px] font-black text-[#0F1A2E]">
                    {inst.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#0F1A2E]">{inst.name}</p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">
                  {institutionTypeLabels[inst.organizationType]} {inst.verificationStatus === "verified" ? "· ✓ verificada" : ""}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-xs font-bold text-[#0B5E56]">Ver →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}