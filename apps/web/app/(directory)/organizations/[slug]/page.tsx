import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhone, FiGlobe, FiMail } from "react-icons/fi";
import { INSTITUTION_LABELS, institutionTypeLabels, type InstitutionPublicView } from "@workdeal/shared";
import { getPublicInstitution } from "@/lib/organizations";
import { VerificationBadge, degreeFromBadges } from "@/components/features/verification-badge";
import { ProfileMap } from "@/components/features/profile-map";
import { Analytics } from "@/components/features/analytics";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data: institution } = await getPublicInstitution(slug);
    return {
      title: `${institution.name} — Workdeal`,
      description: institution.tagline ?? institution.description?.slice(0, 160) ?? "Instituição e organização representada no directório Workdeal.",
      openGraph: {
        title: institution.name,
        description: institution.tagline ?? undefined,
        images: institution.logoUrl ? [{ url: institution.logoUrl }] : undefined,
      },
    };
  } catch {
    return { title: "Instituição não encontrada — Workdeal" };
  }
}

function JsonLd({ institution }: { institution: InstitutionPublicView }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: institution.name,
    description: institution.description ?? undefined,
    image: institution.logoUrl ?? undefined,
    foundingDate: institution.foundedAt ? institution.foundedAt.getFullYear() : undefined,
    contactPoint: institution.email
      ? [{ "@type": "ContactPoint", email: institution.email }]
      : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

export default async function InstitutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let institution: InstitutionPublicView;
  try {
    const res = await getPublicInstitution(slug);
    institution = res.data;
  } catch {
    notFound();
  }

  const verified = institution.verificationStatus === "verified";
  const verificationDegree = degreeFromBadges(institution.badges);
  const members = institution.members.filter((m) => m.status === "approved" || m.status === "verified");
  const memberSinceYear = institution.verifiedAt
    ? new Date(institution.verifiedAt).getFullYear()
    : institution.foundedAt
      ? new Date(institution.foundedAt).getFullYear()
      : null;
  const locLine = [institution.district, institution.province, institution.city].filter(Boolean).join(" · ");
  const hasCoords = institution.latitude != null && institution.longitude != null;

  return (
    <div className="bg-[#F6F3EE] min-h-screen">
      <JsonLd institution={institution} />
      <Analytics profileId={institution.id} province={institution.province ?? undefined} district={institution.district ?? undefined} />

      <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">
          <Link href="/" className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
            Início
          </Link>
          <span className="text-[#D9D2C2]">/</span>
          <Link href={`/${INSTITUTION_LABELS.urlSlug}`} className="text-[#0F1A2E]/40 transition-colors hover:text-[#0F1A2E]">
            {INSTITUTION_LABELS.navLabel}
          </Link>
          <span className="text-[#D9D2C2]">/</span>
          <span className="truncate text-[#0B5E56]">{institution.name}</span>
        </nav>

        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          <div className={`h-[4px] w-full ${verified ? "bg-[#0B5E56]" : "bg-[#D9D2C2]/60"}`} />

          <div className="relative">
            <div className="h-[132px] overflow-hidden bg-[#0F1A2E] sm:h-[168px]">
              {institution.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={institution.coverUrl} alt="" className="size-full object-cover opacity-90" />
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
            </div>
            <div className="absolute -bottom-10 left-5 z-10 flex items-end gap-3 sm:left-7">
              <div className="relative flex size-[84px] items-center justify-center overflow-hidden rounded-[18px] border-[3px] border-white bg-white p-2 shadow-[0_8px_24px_rgba(15,26,46,0.18)] sm:size-[96px]">
                {institution.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institution.logoUrl} alt={institution.name} className="size-full object-contain" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-[#F6F3EE] font-black tracking-[-0.04em] text-[#0F1A2E] text-xl">
                    {institution.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-6 pt-12 sm:grid-cols-[1.35fr_0.7fr] sm:px-7 sm:pb-7">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
                {institutionTypeLabels[institution.organizationType]}
                {locLine ? ` · ${locLine}` : ""}
                {memberSinceYear ? ` · desde ${memberSinceYear}` : ""}
              </p>
              <h1 className="mt-2 inline-flex flex-wrap items-center gap-2 text-[26px] font-black leading-[0.95] tracking-[-0.05em] text-[#0F1A2E] sm:text-[32px]" style={{ fontFamily: "var(--font-display)" }}>
                <span>{institution.name}</span>
                <VerificationBadge degree={verificationDegree} size={28} />
              </h1>
              {institution.tagline ? <p className="mt-2 max-w-[56ch] text-[14px] leading-snug text-[#0F1A2E]/70">{institution.tagline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {institution.categories.slice(0, 4).map((c) => (
                  <span key={c.id} className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1 text-xs font-medium text-[#0F1A2E]/80">
                    {c.name}
                  </span>
                ))}
                <span className="rounded-full bg-[#0F1A2E] px-3 py-1 text-xs font-bold text-white">{institutionTypeLabels[institution.organizationType]}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                {institution.whatsapp ? (
                  <a
                    href={`https://wa.me/${institution.whatsapp.replace(/\D/g, "")}`}
                    aria-label="WhatsApp"
                    title="WhatsApp"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-11 items-center justify-center rounded-full bg-[#0B5E56] text-white shadow-sm hover:bg-[#0A4A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
                  >
                    <FaWhatsapp className="size-[18px]" aria-hidden />
                  </a>
                ) : null}
                {institution.phone ? (
                  <a
                    href={`tel:${institution.phone}`}
                    aria-label="Ligar"
                    title="Ligar"
                    className="inline-flex size-11 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  >
                    <FiPhone className="size-[18px]" aria-hidden />
                  </a>
                ) : null}
                {institution.email ? (
                  <a
                    href={`mailto:${institution.email}`}
                    aria-label="Email"
                    title={institution.email}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-[#0B5E56]/15 bg-white text-[#0B5E56] hover:bg-[#0B5E56]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  >
                    <FiMail className="size-[18px]" aria-hidden />
                  </a>
                ) : null}
                {institution.website ? (
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    title={institution.website}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  >
                    <FiGlobe className="size-[18px]" aria-hidden />
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#D9D2C2] border-t border-[#D9D2C2] bg-[#F6F3EE]/70 text-center">
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Empresas membros</p>
              <p className="font-black text-[#0F1A2E]">{institution.membersCount}</p>
              <p className="text-xs text-[#0F1A2E]/50">{institution.verifiedMembersCount} verificadas</p>
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Verificação</p>
              {verified ? (
                <p className="font-black text-[#0B5E56]">Workdeal ✓</p>
              ) : (
                <p className="font-black text-[#0F1A2E]/40">Pendente</p>
              )}
              <p className="text-xs text-[#0F1A2E]/50">identidade institucional</p>
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Registo</p>
              <p className="font-black text-[#0F1A2E]">{memberSinceYear ?? "—"}</p>
              <p className="text-xs text-[#0F1A2E]/50">{institution.foundedAt ? "fundação / admissão" : "Workdeal"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Sobre</p>
              <h2 className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Missão & membresia
              </h2>
              {institution.description ? (
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-[#0F1A2E]/75">{institution.description}</p>
              ) : (
                <p className="mt-3 text-[14px] leading-relaxed text-[#0F1A2E]/45">Esta instituição ainda não descreveu a sua missão.</p>
              )}
            </section>

            {members.length > 0 ? (
              <section className="rounded-[22px] border border-[#D9D2C2] bg-white p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Membresia</p>
                    <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                      Empresas membros
                    </h2>
                  </div>
                  <span className="rounded-full bg-[#0B5E56]/10 px-3 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-[#0B5E56]">
                    {members.length} • {institution.verifiedMembersCount} ✓
                  </span>
                </div>

                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {members.slice(0, 8).map((m) => (
                    <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-white p-3 transition-colors hover:border-[#0B5E56]/25">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-[#D9D2C2] bg-[#F6F3EE]">
                        {m.company.logoUrl ? (
                          <Image src={m.company.logoUrl} alt="" fill sizes="36px" className="object-cover" />
                        ) : (
                          <span className="flex size-full items-center justify-center text-[11px] font-black text-[#0F1A2E]">
                            {m.company.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profiles/${m.company.slug}`} className="block truncate text-sm font-bold text-[#0F1A2E] hover:underline">
                          {m.company.name}
                        </Link>
                        <p className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">
                          {m.status === "verified" ? "✓ membro verificado" : "membro"} {m.company.province ? `· ${m.company.province}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                {members.length > 8 ? (
                  <p className="mt-3 text-center font-mono text-[11px] text-[#0F1A2E]/40">+ {members.length - 8} empresas membros</p>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <section id="contactos" className="rounded-[22px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">Contactos</p>
              <h2 className="mt-1 text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Fale com a instituição
              </h2>

              <div className="mt-4 space-y-2.5 text-sm">
                {institution.email ? (
                  <p className="flex items-center gap-2.5 text-[#0F1A2E]/80">
                    <FiMail className="size-4 shrink-0 text-[#0B5E56]" aria-hidden />
                    <a href={`mailto:${institution.email}`} className="truncate hover:underline">{institution.email}</a>
                  </p>
                ) : null}
                {institution.phone ? (
                  <p className="flex items-center gap-2.5 text-[#0F1A2E]/80">
                    <FiPhone className="size-4 shrink-0 text-[#0B5E56]" aria-hidden />
                    <a href={`tel:${institution.phone}`} className="hover:underline">{institution.phone}</a>
                  </p>
                ) : null}
                {institution.whatsapp ? (
                  <p className="flex items-center gap-2.5 text-[#0F1A2E]/80">
                    <FaWhatsapp className="size-4 shrink-0 text-[#0B5E56]" aria-hidden />
                    <a href={`https://wa.me/${institution.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">
                      WhatsApp
                    </a>
                  </p>
                ) : null}
                {institution.website ? (
                  <p className="flex items-center gap-2.5 text-[#0F1A2E]/80">
                    <FiGlobe className="size-4 shrink-0 text-[#0B5E56]" aria-hidden />
                    <a href={institution.website} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                      {institution.website.replace(/^https?:\/\//, "")}
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Morada</p>
                {[institution.address, institution.city, institution.district].filter(Boolean).length > 0 ? (
                  <p className="mt-1 text-sm font-semibold text-[#0F1A2E]">
                    {[institution.address, institution.city, institution.district].filter(Boolean).join(" — ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-[#0F1A2E]/40">Sem morada registada</p>
                )}
                {institution.province ? <p className="text-sm text-[#0F1A2E]/60">{institution.province} · Moçambique</p> : null}
                {hasCoords ? (
                  <div className="mt-3 h-[160px] overflow-hidden rounded-xl border border-[#D9D2C2] bg-white">
                    <ProfileMap lat={institution.latitude!} lng={institution.longitude!} name={institution.name} address={institution.address ?? undefined} />
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[22px] bg-[#0F1A2E] p-6 text-white">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">{INSTITUTION_LABELS.navLabel}</p>
              <h3 className="mt-2 text-[18px] font-black leading-tight tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>
                É desta instituição? Traga-a para o Workdeal.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Casas à sua empresa equipas, projectos e reputação pública — represente a sua {INSTITUTION_LABELS.navLabel.toLowerCase()} com perfis de membros verificados.
              </p>
              <Link
                href={`/${INSTITUTION_LABELS.urlSlug}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-black text-[#0F1A2E] hover:bg-[#F6F3EE]"
              >
                Conhecer as {INSTITUTION_LABELS.navLabel.toLowerCase()} →
              </Link>
              <p className="mt-2 text-center font-mono text-[11px] text-white/40">Directório público · Verificação Workdeal</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}