import { notFound } from "next/navigation";
import { getPublicProfile, getPortfolioItems } from "@/lib/profiles";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhone, FiGlobe } from "react-icons/fi";
import { HeroEmailButton, ProfileContacts } from "@/components/features/profile-contacts";
import { ProfileServices } from "@/components/features/profile-services";
import { ProfilePortfolio } from "@/components/features/profile-portfolio";
import { QuoteDialog } from "@/components/features/profile-quote-dialog";
import { Analytics } from "@/components/features/analytics";
import type { PublicProfileView } from "@workdeal/shared";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data: profile } = await getPublicProfile(slug);
    return {
      title: `${profile.name} — Workdeal`,
      description: profile.tagline ?? profile.description?.slice(0, 160) ?? "Perfil verificado no Workdeal.",
      openGraph: {
        title: profile.name,
        description: profile.tagline ?? undefined,
        images: profile.logoUrl ? [{ url: profile.logoUrl }] : undefined,
      },
    };
  } catch {
    return { title: "Perfil não encontrado — Workdeal" };
  }
}

function JsonLd({ profile }: { profile: { name: string; description: string | null; logoUrl: string | null } }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.name,
    description: profile.description ?? undefined,
    image: profile.logoUrl ?? undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

function formatBusinessHours(hours: Record<string, unknown> | null): string | null {
  if (!hours) return null;
  const periods = (hours as { periods?: Array<{ open?: { day?: number; time?: string }; close?: { day?: number; time?: string } }> }).periods;
  if (!Array.isArray(periods) || periods.length === 0) return null;
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const segments = periods.slice(0, 2).map((p) => {
    const openDay = p.open?.day != null ? dayNames[p.open.day] : "";
    const openTime = p.open?.time ?? "";
    const closeTime = p.close?.time ?? "";
    return openDay ? `${openDay} ${openTime}–${closeTime}` : `${openTime}–${closeTime}`;
  });
  return segments.join(" · ");
}

function companySizeLabel(size: string | null): string | null {
  if (!size) return null;
  const map: Record<string, string> = { micro: "Micro Empresa", pequena: "Pequena Empresa", media: "Média Empresa", grande: "Grande Empresa" };
  return map[size] ?? size;
}

function renderStars(rating: number | null): string {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return "★".repeat(full) + (half ? "½" : "");
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let p: PublicProfileView;
  try {
    const res = await getPublicProfile(slug);
    p = res.data;
  } catch {
    notFound();
  }

  // Selo de verificação Workdeal — apenas quando a DB confirma (badge "verified" ativo)
  const verifiedBadge = p.badges.find((b) => b.slug === "verified" && b.status === "active") ?? null;
  const loc = p.location;
  const qual = p.qualification;
  const founded = qual?.foundedYear ? String(qual.foundedYear) : null;
  const sizeLabel = companySizeLabel(qual?.companySize ?? null);
  const memberSince = p.createdAt ? String(new Date(p.createdAt).getFullYear()) : null;
  const reviewAvg = p.reviews.count > 0 ? p.reviews.average : null;
  const hoursStr = formatBusinessHours(p.businessHours as Record<string, unknown> | null);
  const displayAddress = p.formattedAddress ?? loc?.address ?? null;
  const displayProvince = loc?.province ?? null;
  const displayDistrict = loc?.district ?? null;
  const displayBairro = loc?.bairro ?? null;
  const displayLat = loc?.latitude ?? p.latitude;
  const displayLng = loc?.longitude ?? p.longitude;

  let portfolioItems: Awaited<ReturnType<typeof getPortfolioItems>>["data"] = [];
  try {
    const portRes = await getPortfolioItems(p.id);
    portfolioItems = portRes.data ?? [];
  } catch {}

  return (
    <div className="bg-[#F6F3EE] min-h-screen">
      <JsonLd profile={p} />
      <Analytics profileId={p.id} province={loc?.province ?? undefined} district={loc?.district ?? undefined} />

      {/* HERO — thesis: identidade + selo em relevo, não hero centrado genérico */}
      <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          <div className="h-[4px] w-full bg-[#D9D2C2]/60" />

          {/* cover — replica card "sem perfil" de /dashboard/profile/edit quando não há coverUrl */}
          <div className="relative h-[132px] overflow-hidden bg-[#0F1A2E] sm:h-[168px]">
            {p.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverUrl} alt="" className="size-full object-cover opacity-90" />
            ) : (
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: `linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)`,
                    backgroundSize: "48px 48px",
                  }}
                />
                <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[280px] rounded-full bg-[#FF3B1F]/20 blur-[40px]" />
                <div aria-hidden className="pointer-events-none absolute -left-20 bottom-0 size-[240px] rounded-full bg-[#0B5E56]/20 blur-[40px]" />
              </>
            )}
            <div className="absolute -bottom-10 left-5 flex items-end gap-3 sm:left-7">
              <div className="relative size-[84px] overflow-hidden rounded-[18px] border-[3px] border-white bg-[#F6F3EE] shadow-[0_8px_24px_rgba(15,26,46,0.18)] sm:size-[96px]">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt={p.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[#F6F3EE] font-black tracking-[-0.04em] text-[#0F1A2E] text-xl">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-6 pt-12 sm:grid-cols-[1.35fr_0.7fr] sm:px-7 sm:pb-7">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
                {[displayDistrict, displayProvince].filter(Boolean).join(" · ") || null}
                {([displayDistrict, displayProvince].filter(Boolean).length > 0 ? " · " : "") + (p.type === "company" ? "Empresa" : "Perfil")}
                {founded ? ` · desde ${founded}` : ""}
              </p>
              <h1 className="mt-2 inline-flex flex-wrap items-center gap-2 text-[26px] font-black leading-[0.95] tracking-[-0.05em] text-[#0F1A2E] sm:text-[32px]" style={{ fontFamily: "var(--font-display)" }}>
                <span>{p.name}</span>
              </h1>
              {p.tagline ? <p className="mt-2 max-w-[56ch] text-[14px] leading-snug text-[#0F1A2E]/70">{p.tagline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.categories.slice(0, 4).map((c) => (
                  <span key={c.id} className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1 text-xs font-medium text-[#0F1A2E]/80">
                    {c.name}
                  </span>
                ))}
                {sizeLabel ? <span className="rounded-full bg-[#0F1A2E] px-3 py-1 text-xs font-bold text-white">{sizeLabel}</span> : null}
              </div>
            </div>

            {/* acções — react-icons */}
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <a
                  href={p.whatsapp ? `https://wa.me/${p.whatsapp.replace(/\D/g, "")}` : "#contactos"}
                  aria-label="WhatsApp"
                  title="WhatsApp"
                  className="inline-flex size-11 items-center justify-center rounded-full bg-[#0B5E56] text-white shadow-sm hover:bg-[#0A4A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
                >
                  <FaWhatsapp className="size-[18px]" aria-hidden />
                </a>
                <a
                  href={p.phone ? `tel:${p.phone}` : "#contactos"}
                  aria-label="Ligar"
                  title="Ligar"
                  className="inline-flex size-11 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                >
                  <FiPhone className="size-[18px]" aria-hidden />
                </a>
                <HeroEmailButton to={p.email ?? "geral@empresa.co.mz"} profileName={p.name} profileId={p.id} />
                {p.website ? (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    title={p.website}
                    className="hidden size-11 items-center justify-center rounded-full border border-[#0B5E56]/15 bg-white text-[#0B5E56] hover:bg-[#0B5E56]/5 sm:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  >
                    <FiGlobe className="size-[18px]" aria-hidden />
                  </a>
                ) : null}
              </div>
              <p className="text-center font-mono text-[11px] text-[#0F1A2E]/40 sm:text-right">
                {reviewAvg ? `${reviewAvg} ★ · ${p.reviews.count} avaliação${p.reviews.count !== 1 ? "ões" : ""}` : null}
                {!reviewAvg && p.reviews.count === 0 ? "Sem avaliações ainda" : null}
              </p>
            </div>
          </div>

          {/* stats bar — sem porte/trabalhadores/volume */}
          <div className="grid grid-cols-3 divide-x divide-[#D9D2C2] border-t border-[#D9D2C2] bg-[#F6F3EE]/70 text-center">
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Membro desde</p>
              <p className="font-black text-[#0F1A2E]">{memberSince ?? "—"}</p>
              <p className="text-xs text-[#0F1A2E]/50">Workdeal</p>
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Avaliação</p>
              {reviewAvg ? (
                <>
                  <p className="font-black text-[#0F1A2E]">{reviewAvg} <span className="font-normal text-[#0B5E56]">{renderStars(reviewAvg)}</span></p>
                  <p className="text-xs text-[#0F1A2E]/50">{p.reviews.count} avaliação{p.reviews.count !== 1 ? "ões" : ""}</p>
                </>
              ) : (
                <p className="font-black text-[#0F1A2E]/40">—</p>
              )}
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Trabalhadores</p>
              <p className="font-black text-[#0F1A2E]">{qual?.workers ?? "—"}</p>
              {sizeLabel ? <p className="text-xs text-[#0F1A2E]/50">{sizeLabel}</p> : null}
            </div>
          </div>
        </div>

        {/* corpo — 2 colunas: esquerda densa, direita sticky sem bento */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          {/* ESQUERDA */}
          <div className="space-y-6">
            {/* sobre */}
            <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Sobre</p>
              <h2 className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Quem somos
              </h2>
              {p.description ? (
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[#0F1A2E]/75">{p.description}</p>
              ) : (
                <p className="mt-3 text-[14px] leading-relaxed text-[#0F1A2E]/45">Esta entidade ainda não descreveu a sua atividade.</p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {qual?.alvara ? <span className="rounded-full bg-[#0F1A2E] px-3 py-1.5 text-xs font-bold text-white">Alvará {qual.alvara}</span> : null}
                {qual?.nuit ? <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs font-medium">NUIT {qual.nuit}</span> : null}
                {!qual?.alvara && !qual?.nuit ? null : null}
              </div>
            </section>

            {/* credibilidade — selo circular PNG + duas famílias distintas */}
            <section className="overflow-hidden rounded-[22px] border border-[#D9D2C2] bg-white">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#D9D2C2] bg-[#F6F3EE]/60 px-6 py-4 sm:px-7">
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Credibilidade</p>
                  <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                    Selo & pertença
                  </h2>
                </div>
                <span className="rounded-full bg-[#0B5E56] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-white">
                  {verifiedBadge ? "Certificado Workdeal" : "Sem certificação Workdeal"}
                </span>
              </div>

              <div className="flex flex-col gap-6 p-6 sm:p-7">
                {/* 1ª linha — selo de validação Workdeal (só se a DB confirmar badge "verified") */}
                {verifiedBadge ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="relative size-[148px] shrink-0 sm:size-[168px]">
                      <div className="absolute inset-0 overflow-hidden rounded-full border border-[#D9D2C2] bg-white shadow-[0_8px_24px_rgba(15,26,46,0.10)]" aria-hidden>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="" aria-hidden className="absolute inset-0 size-full object-contain p-8 opacity-[0.08] select-none" />
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-full opacity-[0.04]"
                          style={{
                            backgroundImage: "linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)",
                            backgroundSize: "22px 22px",
                          }}
                        />
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/seal-workdeal.png"
                        alt="Selo Workdeal Verificado — selo circular"
                        width={168}
                        height={168}
                        className="relative size-full rounded-full object-cover p-1.5"
                      />
                      <div className="pointer-events-none absolute inset-[11px] flex flex-col items-center justify-center rounded-full border-[1.5px] border-[#0B5E56]/15 text-center">
                        <span className="font-mono text-[9px] font-black uppercase tracking-[0.22em] text-[#0B5E56]">Workdeal</span>
                        <span className="mt-0.5 font-black tracking-[-0.04em] text-[#0F1A2E] text-[15px] leading-none" style={{ fontFamily: "var(--font-display)" }}>
                          VERIFICADO
                        </span>
                        <span className="mt-1 h-px w-10 bg-[#D9D2C2]" aria-hidden />
                        <span className="mt-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[#0F1A2E]/40">
                          {new Date(verifiedBadge.awardedAt).getFullYear()} · {displayProvince ? displayProvince.toUpperCase() : "MOÇAMBIQUE"}
                        </span>
                      </div>
                      <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#0B5E56] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white shadow">
                        ✓ Verificado
                      </span>
                    </div>
                    <p className="mt-4 font-mono text-[11px] leading-relaxed text-[#0F1A2E]/50">
                      Selo de validação Workdeal · verificação de identidade
                    </p>
                    <Link href="/dashboard/profile/edit" className="mt-2 text-xs font-bold text-[#0B5E56] hover:underline">
                      Ver dossiê →
                    </Link>
                  </div>
                ) : null}

                {/* 2ª linha — selos de qualidade e conformidade */}
                {p.badges.filter((b) => ["trust", "quality", "specialization", "performance"].includes(b.type)).length > 0 && (
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden /> Qualidade & conformidade
                  </p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    {p.badges.filter((b) => ["trust", "quality", "specialization", "performance"].includes(b.type)).map((s) => (
                      <li
                        key={s.id}
                        className={`flex gap-3 rounded-2xl border p-3.5 ${s.status === "active" ? "border-[#0B5E56]/15 bg-[#F6F3EE]" : "border-[#D9D2C2] bg-white"}`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${s.status === "active" ? "bg-[#0B5E56]" : "bg-[#FF3B1F]"}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-none text-[#0F1A2E]">{s.name}</p>
                          {s.description ? <p className="mt-1 text-xs leading-snug text-[#0F1A2E]/55">{s.description}</p> : null}
                          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">
                            {new Date(s.awardedAt).getFullYear()} · {s.type}
                          </p>
                        </div>
                        <span
                          className={`ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${s.status === "active" ? "bg-[#0B5E56] text-white" : "bg-[#FF3B1F] text-white"}`}
                          aria-label={s.status === "active" ? "Activo" : "Revogado"}
                        >
                          {s.status === "active" ? "✓" : "…"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                )}

                {/* 3ª linha — membro de */}
                {p.badges.filter((b) => ["network", "commercial", "reputation"].includes(b.type)).length > 0 && (
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0F1A2E]" aria-hidden /> Membro de
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/45">Câmaras e associações sectoriais</p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {p.badges.filter((b) => ["network", "commercial", "reputation"].includes(b.type)).map((m) => (
                      <li
                        key={m.id}
                        className={`flex gap-3 rounded-2xl border p-3.5 ${m.status === "active" ? "border-[#0F1A2E]/10 bg-white" : "border-[#D9D2C2] bg-[#F6F3EE]/60"}`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${m.status === "active" ? "bg-[#0F1A2E]" : "bg-[#FF3B1F]"}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-none text-[#0F1A2E]">{m.name}</p>
                          {m.description ? <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#0F1A2E]/55">{m.description}</p> : null}
                          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">desde {new Date(m.awardedAt).getFullYear()}</p>
                        </div>
                        <span
                          className={`ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${m.status === "active" ? "bg-[#0F1A2E] text-white" : "bg-[#FF3B1F] text-white"}`}
                          aria-label={m.status === "active" ? "Activa" : "Pendente"}
                        >
                          {m.status === "active" ? "✓" : "…"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                )}
              </div>

              <div className="border-t border-[#D9D2C2] bg-[#0F1A2E] px-6 py-3 sm:px-7">
                <p className="text-xs leading-relaxed text-white/85">
                  <span className="font-bold text-white">Como verificamos:</span> equipa Workdeal valida documentação e pertença via Balcão Único, INAGE e secretarias das associações. Selos a vermelho voltam a verde em até 48h após envio de comprovativo.
                </p>
              </div>
            </section>

            <ProfileServices services={p.services} targetProfileId={p.id} profileName={p.name} profileEmail={p.email} />

            <ProfilePortfolio targetProfileId={p.id} profileName={p.name} profileEmail={p.email} items={portfolioItems} />
          </div>

          {/* DIREITA — sticky */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* contactos — cards com ícone + dialog */}
            <section id="contactos" className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Contactos</p>
              <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Fale com a equipa
              </h2>

              <div className="mt-4">
                <ProfileContacts
                  whatsapp={p.whatsapp}
                  phone={p.phone}
                  email={p.email}
                  website={p.website}
                  name={p.name}
                  profileId={p.id}
                  contactVerifications={p.contactVerifications}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Morada</p>
                {displayAddress || displayBairro || displayDistrict ? (
                  <p className="mt-1 text-sm font-semibold text-[#0F1A2E]">
                    {[displayAddress, displayBairro, displayDistrict].filter(Boolean).join(" — ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-[#0F1A2E]/40">Sem morada registada</p>
                )}
                {displayProvince ? <p className="text-sm text-[#0F1A2E]/60">{displayProvince} · Moçambique</p> : null}
                {displayLat != null && displayLng != null ? (
                  <div className="mt-3 h-[132px] overflow-hidden rounded-xl border border-[#D9D2C2] bg-white">
                    <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#F6F3EE_0%,#FFFFFF_100%)] p-4 text-center">
                      <div>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">Mapa</p>
                        {displayBairro && displayDistrict ? <p className="mt-1 text-xs text-[#0F1A2E]/60">{displayBairro} · {displayDistrict}</p> : null}
                        <p className="text-xs text-[#0F1A2E]/40">{displayLat.toFixed(2)}, {displayLng.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {hoursStr ? <p className="mt-2 font-mono text-[11px] text-[#0F1A2E]/40">Horário: {hoursStr}</p> : null}
              </div>
            </section>

            {/* verificação CTA */}
            <section className="rounded-[22px] bg-[#0F1A2E] p-6 text-white">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">Confiança</p>
              <h3 className="mt-2 text-[18px] font-black leading-tight tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
                Precisa de proposta com selo?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">Pedimos orçamento em nome da tua empresa e devolvemos em até 24h com documentação anexa.</p>
              <QuoteDialog
                targetProfileId={p.id}
                profileName={p.name}
                profileEmail={p.email}
                serviceLabel="Pedido de proposta"
                serviceTag="geral"
                trigger={
                  <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-[#0F1A2E] hover:bg-[#F6F3EE]">
                    Pedir proposta →
                  </button>
                }
              />
              <p className="mt-2 text-center font-mono text-[11px] text-white/40">Sem comissão · Sem spam</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
