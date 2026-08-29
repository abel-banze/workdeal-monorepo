import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import type { ProfileView } from "@workdeal/shared";
import { getProfiles, getCategories } from "@/lib/profiles";
import { ProfileCard } from "@/components/features/profile-card";
import { HomeSearch } from "@/components/features/home-search";
import { applyDefaultLocation, parseLocationCookies } from "@/lib/location-consent";

export const revalidate = 3600;

export async function generateMetadata() {
  return {
    title: "Workdeal — Onde os negócios se encontram",
    description:
      "O Workdeal é o ecossistema global de negócios — uma plataforma digital onde empresas verificadas ganham visibilidade, constroem confiança e fecham negócios sem fronteiras.",
    openGraph: {
      title: "Workdeal — Onde os negócios se encontram.",
      description:
        "Mais do que um directório: a comunidade global onde empresas sérias se encontram, se recomendam e crescem juntas.",
    },
  };
}

type Props = { searchParams: Promise<Record<string, string | undefined>> };

async function FeaturedCompanies({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  let companies: ProfileView[] = [];
  let total = 0;
  let failed = false;
  try {
    const { data: profiles, meta } = await getProfiles({ ...searchParams, limit: "6" });
    companies = profiles.filter((p) => p.type === "company");
    total = typeof meta?.total === "number" ? (meta.total as number) : companies.length;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
            <div className="flex gap-4">
              <div className="size-12 rounded-full bg-[#F6F3EE] border border-[#D9D2C2]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 rounded bg-[#F6F3EE]" />
                <div className="h-2 w-48 rounded bg-[#F6F3EE]/80" />
                <div className="flex gap-1.5 pt-1">
                  <span className="h-5 w-16 rounded-full border border-[#D9D2C2] bg-[#F6F3EE]" />
                  <span className="h-5 w-20 rounded-full border border-[#D9D2C2] bg-[#F6F3EE]" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-[#0F1A2E]/35">A carregar empresas da comunidade…</p>
          </div>
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-[#D9D2C2] bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-[#0F1A2E]">Nenhuma empresa encontrada com estes filtros.</p>
        <p className="mt-1 text-sm text-[#0F1A2E]/60">Tente outra categoria ou limpe a pesquisa para explorar a comunidade.</p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-white px-5 text-sm font-semibold hover:bg-[#0F1A2E] hover:text-white transition-colors"
        >
          Limpar filtros
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">
          {total} EMPRESAS EM DESTAQUE
        </p>
        <Link href="/companies" className="text-xs font-semibold text-[#0F1A2E]/60 hover:text-[#0F1A2E]">
          Explorar directório completo →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {companies.map((p) => (
          <ProfileCard key={p.id} profile={p} />
        ))}
      </div>
    </>
  );
}

const CATEGORY_FALLBACK = [
  { id: "1", name: "Construção & Obras", slug: "construcao" },
  { id: "2", name: "Electricidade", slug: "electricidade" },
  { id: "3", name: "Canalização", slug: "canalizacao" },
  { id: "4", name: "Climatização", slug: "climatizacao" },
  { id: "5", name: "Carpintaria", slug: "carpintaria" },
  { id: "6", name: "Limpeza & Manutenção", slug: "limpeza" },
  { id: "7", name: "Informática", slug: "informatica" },
  { id: "8", name: "Transporte & Logística", slug: "transporte" },
];

export default async function DirectoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const locationParams = applyDefaultLocation(params, parseLocationCookies(await cookies()));
  const categoriesRes = await getCategories().catch(() => ({ data: [] as { id: string; name: string; slug: string }[] }));
  const categories = (categoriesRes as { data: { id: string; name: string; slug: string }[] }).data;
  const displayCats = categories.length ? categories.slice(0, 8) : CATEGORY_FALLBACK;

  return (
    <div className="bg-[#F6F3EE]">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#D9D2C2] bg-[#F6F3EE]">
        {/* subtle paper texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to right, #0F1A2E 1px, transparent 1px), linear-gradient(to bottom, #0F1A2E 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-[620px] rounded-full bg-[#FF3B1F]/[0.07] blur-[70px]" />
        <div aria-hidden className="pointer-events-none absolute -left-40 top-48 size-[520px] rounded-full bg-[#0B5E56]/[0.08] blur-[70px]" />

        <div className="relative mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-16">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#0F1A2E]/10 bg-white px-3.5 py-1.5 shadow-sm">
                <span className="size-2 rounded-full bg-[#0B5E56] animate-pulse" />
                <span className="text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/70">
                  COMUNIDADE DE NEGÓCIOS • PLATAFORMA GLOBAL
                </span>
                <span className="hidden sm:inline-flex ml-1 rounded-full bg-[#0F1A2E] px-2 py-0.5 text-[10px] font-black tracking-[0.12em] text-white">
                  NOVO
                </span>
              </div>

              <h1
                className="mt-6 font-black tracking-[-0.06em] leading-[0.88] text-[#0F1A2E]"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(38px, 6.2vw, 68px)" }}
              >
                Onde os
                <br />
                <span className="relative inline-block">
                  negócios
                  <span aria-hidden className="absolute -bottom-1.5 left-0 h-[8px] w-full bg-[#FF3B1F]/15 -rotate-[0.6deg]" />
                </span>
                <br />
                <span className="font-light tracking-[-0.05em] text-[#0F1A2E]/90">se encontram.</span>
              </h1>

              <p className="mt-5 max-w-[540px] text-[16px] leading-relaxed text-[#0F1A2E]/65">
                O Workdeal não é uma lista. É o <span className="font-semibold text-[#0F1A2E]">ecossistema</span> onde empresas
                sérias ganham visibilidade, constroem confiança e fecham negócios — sem fronteiras, 100% digital.
              </p>

              <div className="mt-7">
                <HomeSearch categories={displayCats as { id: string; name: string; slug: string }[]} initialParams={params} />
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#0F1A2E]/45">Mais procurados:</span>
                  {["Construção", "Electricidade", "Climatização", "Transporte"].map((t) => (
                    <Link
                      key={t}
                      href={`/?q=${encodeURIComponent(t)}#empresas`}
                      className="rounded-full border border-[#0F1A2E]/10 bg-white px-3 py-1 text-xs font-medium text-[#0F1A2E]/70 transition-colors hover:bg-[#0F1A2E] hover:text-white"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[#0F1A2E]/55">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#0B5E56] text-[10px] text-white">✓</span>
                    Empresas verificadas pela equipa Workdeal
                  </span>
                  <span className="hidden sm:inline text-[#D9D2C2]">•</span>
                  <span>Contacto directo, sem intermediários</span>
                </p>
              </div>

              {/* proof row — business language only */}
              <div className="mt-8 flex flex-wrap gap-6 border-t border-[#0F1A2E]/10 pt-6">
                {[
                  { k: "3.400+", l: "empresas activas\nna comunidade" },
                  { k: "8", l: "sectores de\nactividade" },
                  { k: "48h", l: "tempo médio\nde resposta" },
                ].map((s) => (
                  <div key={s.k} className="min-w-[110px] border-l-2 border-[#0B5E56]/25 pl-3">
                    <p className="font-black tracking-tight text-[#0F1A2E] leading-none text-[18px]" style={{ fontFamily: "var(--font-display)" }}>
                      {s.k}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-[11px] font-semibold leading-tight tracking-wide text-[#0F1A2E]/50 uppercase">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* right — card clássico */}
            <div className="relative lg:pl-6">
              {/* selo perfurado */}
              <div className="absolute -top-2 right-4 z-10 hidden -rotate-[8deg] rounded-[14px] border-2 border-dashed border-[#0B5E56]/40 bg-white px-3 py-2 shadow-sm sm:flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-[#0B5E56] text-white text-xs">✓</span>
                <div className="leading-none">
                  <p className="text-[11px] font-black tracking-[0.14em] text-[#0B5E56]">VERIFICADO</p>
                  <p className="text-[10px] font-semibold tracking-wide text-[#0F1A2E]/50">SELO WORKDEAL</p>
                </div>
              </div>

              <div className="relative rounded-[20px] border border-[#D9D2C2] bg-white p-3 shadow-[0_12px_40px_rgba(15,26,46,0.10)]">
                {/* mapa abstracto — grelha + pins */}
                <div className="relative overflow-hidden rounded-[14px] border border-[#D9D2C2] bg-[#EDE9E1]">
                  <div
                    className="h-[260px] w-full opacity-40"
                    style={{
                      backgroundImage: `repeating-linear-gradient(0deg, transparent 0 31px, rgba(15,26,46,0.08) 31px 32px), repeating-linear-gradient(90deg, transparent 0 31px, rgba(15,26,46,0.08) 31px 32px)`,
                    }}
                  />
                  {/* pins */}
                  <div className="absolute left-[28%] top-[42%] flex flex-col items-center">
                    <span className="rounded-full bg-[#0F1A2E] px-2 py-1 text-[10px] font-bold text-white shadow">2.3 km</span>
                    <span className="mt-1 size-3 rounded-full border-2 border-white bg-[#FF3B1F] shadow" />
                  </div>
                  <div className="absolute left-[58%] top-[30%] flex flex-col items-center">
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#0F1A2E] border">4.1 km</span>
                    <span className="mt-1 size-3 rounded-full border-2 border-white bg-[#0B5E56] shadow" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-white/85 backdrop-blur px-3 py-2 text-[11px] font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-[#0F1A2E]">
                      <span className="size-2 rounded-full bg-[#0B5E56]" /> Perto de si • Global
                    </span>
                    <span className="rounded-full bg-[#0F1A2E] px-2.5 py-1 text-white text-[11px]">Empresas verificadas</span>
                  </div>
                </div>

                {/* stacked mini cards — o que o cliente reconhece */}
                <div className="mt-3 grid gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] p-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#0F1A2E] text-xs font-bold text-white">EC</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-none text-[#0F1A2E]">Elétrica Central • Maputo</p>
                      <p className="text-xs text-[#0F1A2E]/60">Electricidade • 1.2 km • ★ 4.9 (84)</p>
                    </div>
                    <span className="rounded-full bg-[#0B5E56] px-2 py-1 text-[10px] font-bold tracking-widest text-white">OURO</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-[#D9D2C2] bg-white p-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#FF3B1F] text-xs font-bold text-white">HM</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold leading-none text-[#0F1A2E]">Hidro Maputo</p>
                      <p className="text-xs text-[#0F1A2E]/60">Canalização • 3.8 km • Verificada</p>
                    </div>
                    <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2 py-1 text-[10px] font-bold tracking-widest text-[#0F1A2E]/60">
                      VERIFICADA
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-center text-[11px] font-medium tracking-wide text-[#0F1A2E]/40">
                  Global • Digital • Empresas verificadas onde estiver
                </p>
              </div>

              {/* métrica flutuante — benefício, não técnica */}
              <div className="absolute -bottom-4 -left-2 hidden sm:flex items-center gap-3 rounded-full border border-[#D9D2C2] bg-white px-4 py-2.5 shadow-lg">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#FF3B1F] text-white text-sm">◐</span>
                <div className="leading-none">
                  <p className="text-xs font-black text-[#0F1A2E]">Resposta em ~2h</p>
                  <p className="text-[11px] font-medium text-[#0F1A2E]/60">média na comunidade</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO — ecossistema vs directório */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#0B5E56]">MANIFESTO</p>
            <h2
              className="mt-3 text-[32px] font-black leading-[0.92] tracking-[-0.05em] text-[#0F1A2E] sm:text-[36px]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mais do que
              <br />
              um directório.
              <br />
              <span className="font-light tracking-[-0.04em] text-[#0F1A2E]/75">Um ecossistema.</span>
            </h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-[#0F1A2E]/65">
              Listas há muitas. Comunidades de negócio, poucas. No Workdeal cada empresa tem rosto, histórico e reputação — e cada
              cliente encontra quem resolve, com confiança.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-4 py-2 text-xs font-semibold text-[#0F1A2E]/60">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" /> Plataforma global. Pensada para quem faz.
            </div>
          </div>

          <div className="grid gap-4">
            {[
              {
                title: "Presença que impõe respeito",
                desc: "Perfil completo com fotos, serviços, áreas de actuação e portfólio. A sua empresa apresentada como merece — profissional, clara, memorável.",
                icon: "◈",
                accent: "border-[#0B5E56]/20 bg-[#0B5E56]/5",
              },
              {
                title: "Conexões que geram negócio",
                desc: "Quem procura encontra por proximidade e necessidade real. Quem é encontrado é contactado directamente — WhatsApp, telefone, email. Sem barreiras.",
                icon: "◎",
                accent: "border-[#FF3B1F]/15 bg-[#FF3B1F]/5",
              },
              {
                title: "Crescimento em comunidade",
                desc: "Selos de verificação, avaliações de clientes reais e participação em oportunidades. Quanto mais presente, mais recomendado. É o efeito de rede a trabalhar por si.",
                icon: "✦",
                accent: "border-[#0F1A2E]/10 bg-[#0F1A2E]/[0.04]",
              },
            ].map((card) => (
              <div key={card.title} className={`rounded-[20px] border bg-white p-6 ${card.accent}`}>
                <div className="flex items-start gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white text-sm font-bold text-[#0F1A2E]">
                    {card.icon}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-bold tracking-tight text-[#0F1A2E]">{card.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1A2E]/60">{card.desc}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-[20px] border border-[#0F1A2E] bg-[#0F1A2E] p-6 text-white sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-white/70">
                  SELOS DE CONFIANÇA
                </span>
                <span className="text-xs text-white/40">• Verificação visível</span>
              </div>
              <h3 className="mt-3 text-xl font-black tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Confiança que se vê. E que vende.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Cada empresa é validada pela nossa equipa — documentos, presença e histórico. O selo no perfil não é decoração: é o
                sinal que o cliente procura antes de decidir.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { name: "Ouro", label: "Máxima confiança", dot: "bg-[#E8B44A]" },
                  { name: "Prata", label: "Verificada", dot: "bg-[#CFC8B8]" },
                  { name: "Base", label: "Activa", dot: "bg-white" },
                ].map((b) => (
                  <div key={b.name} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-center">
                    <span className={`mx-auto flex size-7 items-center justify-center rounded-full ${b.dot} text-[10px] font-black text-[#0F1A2E]`}>
                      {b.name[0]}
                    </span>
                    <p className="mt-2 text-xs font-bold">{b.name}</p>
                    <p className="text-[11px] text-white/50">{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section id="categorias" className="border-y border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#0B5E56]">SECTORES • TODOS NUM SÓ LUGAR</p>
              <h2 className="mt-2 text-[26px] font-black tracking-[-0.04em] text-[#0F1A2E] leading-none sm:text-[28px]" style={{ fontFamily: "var(--font-display)" }}>
                Da obra à tecnologia. Encontre quem resolve.
              </h2>
              <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-[#0F1A2E]/60">
                Construção, electricidade, climatização, transporte — cada sector com empresas verificadas e prontas para trabalhar.
              </p>
            </div>
            <Link
              href="/companies"
              className="hidden sm:inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-4 text-sm font-semibold hover:bg-[#0F1A2E] hover:text-white transition-colors"
            >
              Ver directório completo
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {displayCats.map((c) => (
              <Link
                key={c.id}
                href={`/?categoryId=${c.id}#empresas`}
                className="group flex flex-col gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] p-4 transition-all hover:border-[#0F1A2E] hover:bg-white hover:shadow-[0_8px_24px_rgba(15,26,46,0.08)]"
              >
                <span className="flex size-9 items-center justify-center rounded-full border border-[#0F1A2E]/10 bg-white text-[13px] transition-colors group-hover:bg-[#0F1A2E] group-hover:text-white">
                  ◆
                </span>
                <span className="text-[13.5px] font-bold leading-tight text-[#0F1A2E]">{c.name}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide text-[#0F1A2E]/50">
                  Explorar →
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex justify-center sm:hidden">
            <Link href="/companies" className="inline-flex h-9 items-center rounded-full border border-[#0F1A2E]/10 bg-[#F6F3EE] px-5 text-sm font-semibold">
              Ver todas as categorias
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div className="mx-auto max-w-[860px] text-center">
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#FF3B1F]">COMO FUNCIONA</p>
          <h2 className="mt-2 text-[28px] font-black tracking-[-0.04em] leading-none text-[#0F1A2E] sm:text-[30px]" style={{ fontFamily: "var(--font-display)" }}>
            Três passos. Negócio fechado.
          </h2>
          <p className="mx-auto mt-3 max-w-[560px] text-sm leading-relaxed text-[#0F1A2E]/60">
            Sem formulários intermináveis. Sem intermediário a cobrar por fora. Directo ao ponto, como bons negócios devem ser.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              t: "Descubra",
              d: "Pesquise por serviço ou sector e veja empresas verificadas perto de si, com avaliações e portfólio.",
            },
            {
              step: "02",
              t: "Conecte",
              d: "Compare perfis, veja selos de confiança e escolha com segurança. A reputação está à vista.",
            },
            {
              step: "03",
              t: "Feche negócio",
              d: "Fale directo com a empresa por WhatsApp ou telefone. Orçamento, visita, obra — sem rodeios.",
            },
          ].map((s) => (
            <div key={s.step} className="relative rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-xs font-bold tracking-[0.14em] text-[#0B5E56]">{s.step}</p>
              <p className="mt-3 text-[18px] font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                {s.t}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#0F1A2E]/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REQUISIÇÕES & EVENTOS — oportunidades */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10 lg:py-12">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#0B5E56]">OPORTUNIDADES • JÁ VIVE NO WORKDEAL</p>
          <h2 className="mt-2 text-[26px] font-black tracking-[-0.04em] leading-none text-[#0F1A2E] sm:text-[30px]" style={{ fontFamily: "var(--font-display)" }}>
            Pode resolver. Ou pode pedir.
          </h2>
          <p className="mt-2 max-w-[560px] text-sm leading-relaxed text-[#0F1A2E]/60">
            Duas formas de fazer negócio: responda a pedidos de serviço ou junte-se aos próximos eventos do ecossistema.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[24px] bg-[#0F1A2E] p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[280px] rounded-full bg-[#FF3B1F]/20 blur-[50px]" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FF3B1F] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">Requisições</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white/70">Novo</span>
              </div>
              <h3 className="mt-4 text-[26px] font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-[30px]" style={{ fontFamily: "var(--font-display)" }}>
                Pedidos de serviço à espera de propostas.
              </h3>
              <p className="mt-3 max-w-[440px] text-sm leading-relaxed text-white/65">
                Empresas públicas e privadas publicam o que precisam — obras, manutenção, tecnologia. Veja os detalhes e envie a sua proposta directamente ao solicitante.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/85">
                <li className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                  O que o mercado precisa, em tempo real
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                  Propostas directas, sem intermediários
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/tasks" className="inline-flex h-11 items-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white hover:bg-[#E8350F] transition-colors">
                  Explorar requisições →
                </Link>
                <Link href="/signup" className="inline-flex h-11 items-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white hover:bg-white hover:text-[#0F1A2E] transition-colors">
                  Publicar um pedido
                </Link>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-[#D9D2C2] bg-white p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-[280px] rounded-full bg-[#0B5E56]/10 blur-[50px]" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#0B5E56] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">Eventos</span>
                <span className="rounded-full border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[#0F1A2E]/60">Agenda Moçambique</span>
              </div>
              <h3 className="mt-4 text-[26px] font-black leading-[0.95] tracking-[-0.04em] text-[#0F1A2E] sm:text-[30px]" style={{ fontFamily: "var(--font-display)" }}>
                Feiras, lançamentos e networking.
              </h3>
              <p className="mt-3 max-w-[440px] text-sm leading-relaxed text-[#0F1A2E]/60">
                Siga os próximos eventos do ecossistema Workdeal e inscreva-se em segundos. Presença confirmada, networking real.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-[#0F1A2E]/85">
                <li className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                  Inscrições gratuitas com a sua conta
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                  Crie e gerencie os seus próprios eventos
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/events" className="inline-flex h-11 items-center rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black transition-colors">
                  Ver eventos →
                </Link>
                <Link href="/signup" className="inline-flex h-11 items-center rounded-full border border-[#0F1A2E]/15 bg-[#F6F3EE] px-6 text-sm font-semibold text-[#0F1A2E] hover:bg-[#0F1A2E] hover:text-white transition-colors">
                  Organizar um evento
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EMPRESAS EM DESTAQUE */}
      <section id="empresas" className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[22px] font-black tracking-[-0.04em] text-[#0F1A2E] sm:text-[24px]" style={{ fontFamily: "var(--font-display)" }}>
            Empresas que já fazem parte
          </h2>
          <span className="inline-flex h-6 items-center rounded-full bg-[#0B5E56] px-3 text-[11px] font-bold tracking-widest text-white">
            COMUNIDADE ACTIVA
          </span>
        </div>
        <p className="mt-1.5 max-w-[620px] text-sm leading-relaxed text-[#0F1A2E]/60">
          Negócios reais, com rosto e reputação. Explore perfis completos e entre em contacto directo.
        </p>

        <div className="mt-6">
          <Suspense
            fallback={
              <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-live="polite">
                <span className="sr-only">A carregar empresas…</span>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[#D9D2C2] bg-white p-5">
                    <div className="flex gap-4">
                      <div className="size-12 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 animate-pulse rounded bg-[#F6F3EE]" />
                        <div className="h-2 w-48 animate-pulse rounded bg-[#F6F3EE]/80" />
                        <div className="flex gap-1.5 pt-1">
                          <span className="h-5 w-16 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                          <span className="h-5 w-20 animate-pulse rounded-full bg-[#F6F3EE] ring-1 ring-[#D9D2C2]" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-3 w-20 animate-pulse rounded-full bg-[#F6F3EE]" />
                  </div>
                ))}
              </div>
            }
          >
            <FeaturedCompanies searchParams={locationParams} />
          </Suspense>
        </div>
      </section>

      {/* CTA FINAL — para empresas */}
      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 pb-12">
        <div className="relative overflow-hidden rounded-[28px] border border-[#0F1A2E] bg-[#0F1A2E] px-6 py-8 sm:px-10 sm:py-10">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-[480px] rounded-full bg-[#FF3B1F]/20 blur-[60px]" />
          <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 size-[360px] rounded-full bg-[#0B5E56]/20 blur-[60px]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.85fr] lg:items-center">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-bold tracking-[0.14em] text-white">
                PARA EMPRESAS • ADESÃO GRATUITA
              </p>
              <h2
                className="mt-4 text-[30px] font-black leading-[0.92] tracking-[-0.04em] text-white sm:text-[34px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                A sua empresa
                <br />
                merece ser encontrada.
              </h2>
              <p className="mt-3 max-w-[520px] text-sm leading-relaxed text-white/65">
                Crie o perfil gratuito, seja verificado e entre para a comunidade onde os negócios acontecem todos os dias. Visibilidade,
                confiança e clientes a um contacto de distância.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex h-11 items-center rounded-full bg-[#FF3B1F] px-7 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,59,31,0.35)] hover:bg-[#E8350F] transition-colors">
                  Registar a minha empresa
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center rounded-full border border-white/20 bg-white/5 px-7 text-sm font-semibold text-white hover:bg-white hover:text-[#0F1A2E] transition-colors"
                >
                  Já tenho conta
                </Link>
              </div>
              <p className="mt-4 text-xs font-medium text-white/40">Sem fidelização • Perfil activo em minutos • Suporte em pt-MZ</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                <p className="text-xs font-bold tracking-[0.14em] text-white/50">O QUE GANHA AO ENTRAR</p>
                <ul className="mt-3 space-y-2.5 text-sm text-white/85">
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                    <span>Perfil profissional que transmite confiança desde o primeiro olhar</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                    <span>Aparece para quem procura exactamente o que faz, perto de si</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-[11px] text-white">✓</span>
                    <span>Selo de verificação e avaliações que abrem portas</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl bg-white p-5">
                <p className="text-xs font-bold tracking-[0.14em] text-[#0B5E56]">HISTÓRIAS DA COMUNIDADE</p>
                <p className="mt-2 text-sm leading-relaxed text-[#0F1A2E]/70">
                  &ldquo;No Workdeal o cliente já chega confiante. O selo faz toda a diferença. Hoje 40% dos nossos contactos vêm daqui.&rdquo;
                </p>
                <p className="mt-2 text-xs font-bold text-[#0F1A2E]">— Hidro Maputo, Canalização • Maputo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAIXA FINAL — tagline */}
      <section className="border-t border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-[13px] font-semibold tracking-wide text-[#0F1A2E]/55">
              Workdeal — <span className="font-bold text-[#0F1A2E]">Onde os negócios se encontram.</span> Uma comunidade, não uma lista.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#0F1A2E]/30">
              <span>GLOBAL</span>
              <span className="size-1 rounded-full bg-[#0F1A2E]/20" />
              <span>DIGITAL</span>
              <span className="size-1 rounded-full bg-[#0F1A2E]/20" />
              <span>SEM FRONTEIRAS</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
