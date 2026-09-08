import Link from "next/link";
import Image from "next/image";
import { INSTITUTION_LABELS, institutionTypeLabels, type InstitutionListItem } from "@workdeal/shared";
import { VerificationBadge, degreeFromBadges } from "@/components/features/verification-badge";

type CardBadge = { slug: string; name: string; type: string };

type Props = {
  institution: InstitutionListItem & { distanceKm?: number | null };
  badges?: CardBadge[];
};

const BADGE_STYLE: Record<string, string> = {
  verified: "bg-[#0B5E56] text-white",
  "profile-complete": "bg-[#0F1A2E] text-white",
};

function badgeStyle(slug: string) {
  return BADGE_STYLE[slug] ?? "border border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E]/70";
}

export function OrganizationCard({ institution, badges: badgesProp }: Props) {
  const initials = institution.name.slice(0, 2).toUpperCase();
  const badges = badgesProp ?? institution.badges ?? [];
  const isVerified = institution.verificationStatus === "verified" || badges.some((b) => b.slug === "verified");
  const verificationDegree = degreeFromBadges(badges);
  const topBar = isVerified ? "bg-[#0B5E56]" : "bg-[#D9D2C2]/60";
  const typeLabel = institutionTypeLabels[institution.organizationType];
  const provinceLine = [institution.district, institution.province].filter(Boolean).join(" · ");
  const hasLocation = Boolean(provinceLine);
  const distanceKm = institution.distanceKm ?? null;
  const hasDistance = typeof distanceKm === "number" && Number.isFinite(distanceKm);
  const cardBadges = badges
    .filter((b) => b.slug !== "verified" && b.slug !== "in-legalization")
    .slice(0, 2);

  return (
    <Link
      href={`/${INSTITUTION_LABELS.urlSlug}/${institution.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white transition-all hover:border-[#0B5E56]/20 hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
    >
      <div className={`h-[3px] w-full ${topBar}`} aria-hidden />

      <div className="flex gap-4 p-5 pb-4">
        <div className="relative shrink-0">
          <div className="relative flex size-[56px] items-center justify-center overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] text-[15px] font-black tracking-[-0.02em] text-[#0F1A2E]">
            {institution.logoUrl ? (
              <Image src={institution.logoUrl} alt={`${institution.name} logótipo`} fill sizes="56px" className="object-cover" />
            ) : (
              initials
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
            <span className="size-1 rounded-full bg-[#0B5E56]" aria-hidden />
            <span className="truncate">
              {typeLabel}
              {hasLocation ? ` · ${provinceLine}` : ""}
              {hasDistance ? ` · ${distanceKm!.toFixed(1)} km` : ""}
            </span>
          </p>

          <h3
            className="mt-1 flex items-center gap-1.5 text-[17px] font-black leading-none tracking-[-0.03em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
          >
            <span className="min-w-0 truncate">{institution.name}</span>
            <VerificationBadge degree={verificationDegree} size={20} />
          </h3>
          {institution.tagline ? (
            <p className="mt-1 line-clamp-2 min-h-[2.2rem] text-[13px] leading-snug text-[#0F1A2E]/60">{institution.tagline}</p>
          ) : (
            <p className="mt-1 hidden min-h-[2.2rem] text-[13px] leading-snug text-transparent sm:block" aria-hidden>—</p>
          )}
        </div>
      </div>

      {institution.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-5">
          {institution.categories.slice(0, 2).map((c) => (
            <span
              key={c.id}
              className="inline-flex rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-0.5 text-[11px] font-medium leading-none text-[#0F1A2E]/75"
            >
              {c.name}
            </span>
          ))}
          {institution.categories.length > 2 ? (
            <span className="inline-flex rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[11px] font-bold leading-none text-white">
              +{institution.categories.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}

      {cardBadges.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 px-5">
          {cardBadges.map((b) => (
            <span key={b.slug} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none tracking-wide ${badgeStyle(b.slug)}`}>
              {b.name}
            </span>
          ))}
        </div>
      ) : null}

      {institution.membersCount > 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 pt-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F1A2E]/70">
            <span className="size-1.5 rounded-full bg-[#0F1A2E]/30" aria-hidden />
            {institution.membersCount} {institution.membersCount === 1 ? "empresa membro" : "empresas membros"}
          </span>
          {institution.verifiedMembersCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0B5E56]">
              {institution.verifiedMembersCount} ✓ verificado{institution.verifiedMembersCount !== 1 ? "s" : ""}
            </span>
          ) : null}
          {institution.foundedYear ? (
            <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0F1A2E]/40">
              desde {institution.foundedYear}
            </span>
          ) : null}
        </div>
      ) : institution.foundedYear ? (
        <div className="flex items-center px-5 pt-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#0F1A2E]/40">
            desde {institution.foundedYear}
          </span>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#D9D2C2]/60 bg-[#F6F3EE]/60 px-5 py-3">
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
          {hasLocation ? provinceLine : hasDistance ? `${distanceKm!.toFixed(1)} km` : isVerified ? "Verificada · Workdeal" : "Instituição · Moçambique"}
          {hasLocation && hasDistance ? ` · ${distanceKm!.toFixed(1)} km` : ""}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#0B5E56] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver perfil <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}