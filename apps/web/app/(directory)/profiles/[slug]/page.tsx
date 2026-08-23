import { notFound } from "next/navigation";
import { getProfileBySlug } from "@/lib/profiles";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhone, FiGlobe } from "react-icons/fi";
import { BsPatchCheckFill, BsExclamationTriangleFill } from "react-icons/bs";
import { HeroEmailButton, ProfileContacts } from "@/components/features/profile-contacts";
import { ProfileServices } from "@/components/features/profile-services";
import { ProfilePortfolio } from "@/components/features/profile-portfolio";
import { QuoteDialog } from "@/components/features/profile-quote-dialog";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { data: profile } = await getProfileBySlug(slug);
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

// Mock — selos separados por natureza (qualidade vs. membresia). Alvará/NUIT não entram em Credibilidade.
const MOCK_QUALITY = [
  { id: "iso9001", label: "ISO 9001:2015", org: "IQNet · MZ-2023-1841", desc: "Gestão da qualidade", status: "verified" as const, year: "2023" },
  { id: "iso14001", label: "ISO 14001", org: "Gestão ambiental", desc: "Em auditoria externa", status: "pending" as const, year: "2024" },
  { id: "inage", label: "INAGE · Classe 3", org: "Construção civil", desc: "Alvará de empreiteiro válido", status: "verified" as const, year: "2022" },
] as const;

const MOCK_MEMBERSHIPS = [
  { id: "cta", label: "CTA", org: "Confederação das Associações Económicas", since: "2021", status: "verified" as const },
  { id: "ccm", label: "CCM", org: "Câmara de Comércio de Moçambique", since: "2020", status: "verified" as const },
  { id: "apme", label: "APME", org: "Assoc. das Pequenas e Médias Empresas", since: "2022", status: "verified" as const },
  { id: "acis", label: "ACIS", org: "Assoc. Comercial e Industrial de Sofala", since: "2024", status: "pending" as const },
] as const;



export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let profile: Awaited<ReturnType<typeof getProfileBySlug>>["data"];
  try {
    const res = await getProfileBySlug(slug);
    profile = res.data;
  } catch {
    notFound();
  }
  if (!profile) notFound();

  // Enriquecimento com mock onde API é minimal
  const p = profile!;
  const isVerified = p.status === "active"; // mock: active = verificado
  const displayProvince = "Maputo Cidade";
  const displayDistrict = "KaMpfumo";
  const displayBairro = "Sommerschield";
  const founded = "2012";
  const responseTime = "~2h";
  const jobsDone = 147;

  return (
    <div className="bg-[#F6F3EE] min-h-screen">
      <JsonLd profile={p} />

      {/* ALERTA verificação — preview sempre visível */}
      <div role="alert" className="mx-auto max-w-[1160px] px-4 pt-6 sm:px-6">
        <div className="flex items-start gap-3 rounded-[16px] border border-[#E8B86A]/40 bg-[#FFF8E7] px-4 py-3.5 sm:items-center sm:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FF3B1F] text-white">
            <BsExclamationTriangleFill className="size-[14px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-none text-[#7A1A0A]">Identidade não verificada</p>
            <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/70">
              Este perfil não apresentou qualquer documento legal para validação da sua identidade (NUIT, alvará ou documento com fotografia). A Workdeal ainda não pôde confirmar a sua autenticidade. Qualquer contacto é da sua responsabilidade — esta entidade pode não corresponder a uma empresa legalmente constituída.
            </p>
          </div>
          <Link
            href="/dashboard/profile/edit"
            className="hidden shrink-0 rounded-full bg-[#0F1A2E] px-4 py-2 text-xs font-bold text-white hover:bg-black sm:inline-flex"
          >
            Verificar agora
          </Link>
        </div>
      </div>

      {/* HERO — thesis: identidade + selo em relevo, não hero centrado genérico */}
      <div className="mx-auto max-w-[1160px] px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded-[28px] border border-[#D9D2C2] bg-white">
          {/* barra de verificação */}
          <div className={`h-[4px] w-full ${isVerified ? "bg-[#0B5E56]" : "bg-[#D9D2C2]/60"}`} />

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
              {isVerified ? (
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#0B5E56] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow">
                  <span className="size-1.5 rounded-full bg-white" /> Verificado
                </span>
              ) : (
                <span className="mb-2 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#0F1A2E]/60">Em verificação</span>
              )}
            </div>
          </div>

          <div className="grid gap-6 px-5 pb-6 pt-12 sm:grid-cols-[1.35fr_0.7fr] sm:px-7 sm:pb-7">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
                {displayDistrict} · {displayProvince} · {p.type === "company" ? "Empresa" : "Perfil"} · desde {founded}
              </p>
              <h1 className="mt-2 inline-flex flex-wrap items-center gap-2 text-[26px] font-black leading-[0.95] tracking-[-0.05em] text-[#0F1A2E] sm:text-[32px]" style={{ fontFamily: "var(--font-display)" }}>
                <span>{p.name}</span>
                {isVerified ? (
                  <span
                    title="Identidade verificada — Workdeal"
                    aria-label="Identidade verificada"
                    className="inline-flex items-center justify-center rounded-full bg-[#0B5E56]/10 p-1 text-[#0B5E56]"
                  >
                    <BsPatchCheckFill className="size-5 sm:size-6" aria-hidden />
                  </span>
                ) : null}
              </h1>
              {p.tagline ? <p className="mt-2 max-w-[56ch] text-[14px] leading-snug text-[#0F1A2E]/70">{p.tagline}</p> : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.categories.slice(0, 4).map((c) => (
                  <span key={c.id} className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1 text-xs font-medium text-[#0F1A2E]/80">
                    {c.name}
                  </span>
                ))}
                <span className="rounded-full bg-[#0F1A2E] px-3 py-1 text-xs font-bold text-white">Média Empresa</span>
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
                <HeroEmailButton to={p.email ?? "geral@empresa.co.mz"} profileName={p.name} />
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
                Responde {responseTime} · {jobsDone} trabalhos
              </p>
            </div>
          </div>

          {/* stats bar — sem porte/trabalhadores/volume */}
          <div className="grid grid-cols-3 divide-x divide-[#D9D2C2] border-t border-[#D9D2C2] bg-[#F6F3EE]/70 text-center">
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Membro desde</p>
              <p className="font-black text-[#0F1A2E]">{founded}</p>
              <p className="text-xs text-[#0F1A2E]/50">Workdeal</p>
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Concluídos</p>
              <p className="font-black text-[#0F1A2E]">{jobsDone}</p>
              <p className="text-xs text-[#0F1A2E]/50">trabalhos</p>
            </div>
            <div className="px-3 py-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Avaliação</p>
              <p className="font-black text-[#0F1A2E]">4.8 <span className="font-normal text-[#0B5E56]">★★★★★</span></p>
              <p className="text-xs text-[#0F1A2E]/50">38 avaliações</p>
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
                <p className="mt-3 text-[14px] leading-relaxed text-[#0F1A2E]/70">
                  Empresa moçambicana especializada em construção civil, fornecimento e serviços técnicos. Opera em Maputo e províncias, com equipa própria e frota dedicada. Foco em prazos, conformidade e acompanhamento pós-entrega — é por isso que 7 em 10 clientes voltam a contratar.
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-[#0F1A2E] px-3 py-1.5 text-xs font-bold text-white">Alvará 4471/2024</span>
                <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-1.5 text-xs font-medium">NUIT 100812337</span>
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
                <span className="rounded-full bg-[#0B5E56] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-white">5/7 verificados</span>
              </div>

              <div className="flex flex-col gap-6 p-6 sm:p-7">
                {/* 1ª linha — selo de validação de identidade */}
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
                      <span className="mt-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[#0F1A2E]/40">2024 · MAPUTO</span>
                    </div>
                    <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[#0B5E56] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.14em] text-white shadow">
                      ✓ Verificado
                    </span>
                  </div>
                  <p className="mt-4 font-mono text-[11px] leading-relaxed text-[#0F1A2E]/50">
                    Selo de validação de identidade · <span className="font-bold text-[#0F1A2E]/70">Balcão Único · 2024</span>
                  </p>
                  <Link href="/dashboard/profile/edit" className="mt-2 text-xs font-bold text-[#0B5E56] hover:underline">
                    Ver dossiê →
                  </Link>
                </div>

                {/* 2ª linha — selos de qualidade e conformidade */}
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden /> Qualidade & conformidade
                  </p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-3">
                    {MOCK_QUALITY.map((s) => (
                      <li
                        key={s.id}
                        className={`flex gap-3 rounded-2xl border p-3.5 ${s.status === "verified" ? "border-[#0B5E56]/15 bg-[#F6F3EE]" : "border-[#D9D2C2] bg-white"}`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${s.status === "verified" ? "bg-[#0B5E56]" : "bg-[#FF3B1F]"}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-none text-[#0F1A2E]">{s.label}</p>
                          <p className="mt-1 text-xs leading-snug text-[#0F1A2E]/55">{s.org}</p>
                          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">
                            {s.year} · {s.desc}
                          </p>
                        </div>
                        <span
                          className={`ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${s.status === "verified" ? "bg-[#0B5E56] text-white" : "bg-[#FF3B1F] text-white"}`}
                          aria-label={s.status === "verified" ? "Verificado" : "Pendente"}
                        >
                          {s.status === "verified" ? "✓" : "…"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3ª linha — membro de */}
                <div>
                  <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/60">
                    <span className="size-1.5 rounded-full bg-[#0F1A2E]" aria-hidden /> Membro de
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/45">Câmaras e associações sectoriais</p>
                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {MOCK_MEMBERSHIPS.map((m) => (
                      <li
                        key={m.id}
                        className={`flex gap-3 rounded-2xl border p-3.5 ${m.status === "verified" ? "border-[#0F1A2E]/10 bg-white" : "border-[#D9D2C2] bg-[#F6F3EE]/60"}`}
                      >
                        <span className={`mt-1 size-2 shrink-0 rounded-full ${m.status === "verified" ? "bg-[#0F1A2E]" : "bg-[#FF3B1F]"}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-none text-[#0F1A2E]">{m.label}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-snug text-[#0F1A2E]/55">{m.org}</p>
                          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">desde {m.since}</p>
                        </div>
                        <span
                          className={`ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${m.status === "verified" ? "bg-[#0F1A2E] text-white" : "bg-[#FF3B1F] text-white"}`}
                          aria-label={m.status === "verified" ? "Activa" : "Pendente"}
                        >
                          {m.status === "verified" ? "✓" : "…"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-[#D9D2C2] bg-[#0F1A2E] px-6 py-3 sm:px-7">
                <p className="text-xs leading-relaxed text-white/85">
                  <span className="font-bold text-white">Como verificamos:</span> equipa Workdeal valida documentação e pertença via Balcão Único, INAGE e secretarias das associações. Selos a vermelho voltam a verde em até 48h após envio de comprovativo.
                </p>
              </div>
            </section>

            <ProfileServices targetProfileId={p.id} profileName={p.name} profileEmail={p.email} />

            <ProfilePortfolio targetProfileId={p.id} profileName={p.name} profileEmail={p.email} />
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
                <ProfileContacts whatsapp={p.whatsapp} phone={p.phone} email={p.email} website={p.website} name={p.name} />
              </div>

              <div className="mt-4 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/50">Morada</p>
                <p className="mt-1 text-sm font-semibold text-[#0F1A2E]">
                  Av. 25 de Setembro, 1234 — {displayBairro}, {displayDistrict}
                </p>
                <p className="text-sm text-[#0F1A2E]/60">{displayProvince} · Moçambique</p>
                <div className="mt-3 h-[132px] overflow-hidden rounded-xl border border-[#D9D2C2] bg-white">
                  {/* placeholder mapa — sem API key leak */}
                  <div className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#F6F3EE_0%,#FFFFFF_100%)] p-4 text-center">
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">Mapa</p>
                      <p className="mt-1 text-xs text-[#0F1A2E]/60">Sommerschield · KaMpfumo</p>
                      <p className="text-xs text-[#0F1A2E]/40">-25.95, 32.58 · raio 5km</p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 font-mono text-[11px] text-[#0F1A2E]/40">Horário: Seg–Sex 08:00–17:30 · Sáb 08:00–12:00</p>
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
