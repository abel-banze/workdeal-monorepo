import Link from "next/link";
import Image from "next/image";
import type { ProfileView } from "@workdeal/shared";

type Props = {
  profile: ProfileView & { distanceKm?: number | null };
  // opcionais quando o card é usado fora do directory (dashboard preview)
  verified?: boolean;
  sizeLabel?: string;
  district?: string | null;
  province?: string | null;
  distanceKm?: number | null;
};

export function ProfileCard({ profile, verified, sizeLabel, district, province, distanceKm: distanceKmProp }: Props) {
  const initials = profile.name.slice(0, 2).toUpperCase();
  const isVerified = verified ?? false;
  const topBar = isVerified ? "bg-[#0B5E56]" : "bg-[#D9D2C2]/60";
  const distanceKm = distanceKmProp ?? (profile as { distanceKm?: number | null }).distanceKm ?? null;
  const hasDistance = typeof distanceKm === "number" && Number.isFinite(distanceKm);
  const pProvince = province ?? (profile as { province?: string | null }).province ?? null;
  const pDistrict = district ?? (profile as { district?: string | null }).district ?? null;
  const provinceLine = [pDistrict, pProvince].filter(Boolean).join(" · ");
  const hasLocation = Boolean(pProvince || pDistrict);

  return (
    <Link
      href={`/profiles/${profile.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white transition-all hover:border-[#0B5E56]/20 hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
    >
      {/* barra de verificação — codifica estado sem badge genérico */}
      <div className={`h-[3px] w-full ${topBar}`} aria-hidden />

      {/* header */}
      <div className="flex gap-4 p-5 pb-4">
        <div className="relative shrink-0">
          <div className="relative flex size-[56px] items-center justify-center overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] text-[15px] font-black tracking-[-0.02em] text-[#0F1A2E]">
            {profile.logoUrl ? (
              <Image src={profile.logoUrl} alt={`${profile.name} logótipo`} fill sizes="56px" className="object-cover" />
            ) : (
              initials
            )}
          </div>
          {isVerified ? (
            <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#0B5E56] text-[10px] font-black text-white">
              ✓
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          {/* eyebrow mono — província/distrito + distância */}
          {hasLocation ? (
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
              <span className="size-1 rounded-full bg-[#0B5E56]" aria-hidden />
              <span className="truncate">{provinceLine}{hasDistance ? ` · ${distanceKm!.toFixed(1)} km` : ""}</span>
            </p>
          ) : hasDistance ? (
            <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">
              <span className="size-1 rounded-full bg-[#0B5E56]" aria-hidden />
              {distanceKm!.toFixed(1)} km de si
            </p>
          ) : (
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
              {profile.type === "company" ? "Empresa · Moçambique" : "Perfil"}
            </p>
          )}

          <h3
            className="mt-1 line-clamp-1 text-[17px] font-black leading-none tracking-[-0.03em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
          >
            {profile.name}
          </h3>
          {profile.tagline ? (
            <p className="mt-1 line-clamp-2 min-h-[2.2rem] text-[13px] leading-snug text-[#0F1A2E]/60">{profile.tagline}</p>
          ) : (
            <p className="mt-1 hidden min-h-[2.2rem] text-[13px] leading-snug text-transparent sm:block" aria-hidden>—</p>
          )}
        </div>

        {/* selo tamanho — signature discreta */}
        {sizeLabel ? (
          <span className="hidden shrink-0 self-start rounded-full bg-[#0F1A2E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white sm:inline-flex">
            {sizeLabel}
          </span>
        ) : null}
      </div>

      {/* categorias — reduzido para 2 badges pequenos */}
      {profile.categories.length > 0 ? (
        <div className="flex flex-wrap gap-1 px-5">
          {profile.categories.slice(0, 2).map((c) => (
            <span
              key={c.id}
              className="inline-flex rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-0.5 text-[11px] font-medium leading-none text-[#0F1A2E]/75"
            >
              {c.name}
            </span>
          ))}
          {profile.categories.length > 2 ? (
            <span className="inline-flex rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[11px] font-bold leading-none text-white">
              +{profile.categories.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* descrição — 2 linhas */}
      {profile.description ? (
        <p className="mx-5 mt-3 line-clamp-2 border-t border-[#D9D2C2]/60 pt-3 text-[13px] leading-relaxed text-[#0F1A2E]/70">
          {profile.description}
        </p>
      ) : (
        <div className="mx-5 mt-3 border-t border-[#D9D2C2]/30 pt-3" aria-hidden />
      )}

      {/* footer — província + distância / acção */}
      <div className="mt-4 flex items-center justify-between gap-2 bg-[#F6F3EE]/60 px-5 py-3">
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">
          {hasLocation ? provinceLine : hasDistance ? `${distanceKm!.toFixed(1)} km` : isVerified ? "Verificado · Workdeal" : "Workdeal · Perfis"}
          {hasLocation && hasDistance ? ` · ${distanceKm!.toFixed(1)} km` : ""}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#0B5E56] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver perfil <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}
