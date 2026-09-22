import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { TenderView } from "@workdeal/shared";
import { getPublicTender, formatTenderMoney } from "@/lib/tenders";
import { formatDayMonth, formatFull } from "@/lib/dates";
import { getSiteUrl } from "@/lib/seo";
import { ShareDialog } from "@/components/features/share-dialog";
import { FiShare2 } from "react-icons/fi";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await getPublicTender(id);
    if (!data) return { title: "Concurso não encontrado" };
    const title = data.object || data.generalObject || data.reference;
    const description = (data.generalObject || data.object || "Concurso público em Moçambique").slice(0, 160);
    const siteUrl = getSiteUrl();
    const ogImage = {
      url: `${siteUrl}/concursos_og_image.png`,
      width: 1672,
      height: 941,
      alt: `Concurso público no Workdeal — ${title}`,
    };
    return {
      title: `${title}`,
      description,
      alternates: { canonical: `/concursos/${id}` },
      openGraph: {
        title: `${title}`,
        description,
        url: `${siteUrl}/concursos/${id}`,
        siteName: "Workdeal",
        images: [ogImage],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title}`,
        description,
        images: [ogImage.url],
      },
    };
  } catch {
    return { title: "Concurso não encontrado" };
  }
}

function TenderJsonLd({ tender, siteUrl }: { tender: TenderView; siteUrl: string }) {
  const title = tender.object || tender.generalObject || tender.reference;
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: tender.description ?? tender.generalObject ?? title,
    url: `${siteUrl}/concursos/${tender.id}`,
    datePublished: tender.publishedAt ? new Date(tender.publishedAt).toISOString() : undefined,
    dateModified: tender.lastSeenAt ? new Date(tender.lastSeenAt).toISOString() : undefined,
    inLanguage: "pt-MZ",
    publisher: {
      "@type": "Organization",
      name: "Workdeal",
      url: siteUrl,
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="sm:col-span-1">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">{label}</p>
      <p className="mt-1 text-sm font-black text-[#0F1A2E]">{value}</p>
    </div>
  );
}

export default async function PublicTenderPage({ params }: Props) {
  const { id } = await params;

  let tender: TenderView | null;
  try {
    const res = await getPublicTender(id);
    tender = res.data;
  } catch {
    tender = null;
  }
  if (!tender) notFound();

  const title = tender.object || tender.generalObject || tender.reference;
  const documents = tender.documents ?? [];
  const estimatedValue = formatTenderMoney(tender.estimatedValue);
  const provisionalGuarantee = formatTenderMoney(tender.provisionalGuarantee);
  const hasDocuments = documents.length > 0;

  return (
    <div className="bg-[#F6F3EE]">
      <TenderJsonLd tender={tender} siteUrl={getSiteUrl()} />
      <section className="border-b border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.14em]">
            <Link href="/" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Início
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <Link href="/concursos" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Concursos
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <span className="text-[#0B5E56]">CONCURSO</span>
            <span className="ml-auto">
              <ShareDialog
                dialogTitle="Partilhar concurso"
                itemName={title}
                path={`/concursos/${tender.id}`}
                shareText={`${title} · Concurso público no Workdeal`}
                mailSubject={`${title} no Workdeal`}
                footerNote="Qualquer pessoa com o link pode ver este concurso público"
                trigger={
                  <button
                    type="button"
                    aria-label="Partilhar concurso"
                    title="Partilhar"
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-[#D9D2C2] bg-white px-4 text-xs font-bold text-[#0F1A2E] transition-colors hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
                  >
                    <FiShare2 className="size-4" aria-hidden /> Partilhar
                  </button>
                }
              />
            </span>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-[#0F1A2E]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
            <div className="relative px-5 pb-6 pt-7 sm:px-7">
              <div className="flex flex-wrap items-center gap-2">
                {tender.type ? (
                  <span className="rounded-full bg-[#FF3B1F] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">{tender.type}</span>
                ) : null}
                {tender.category ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80">{tender.category}</span>
                ) : null}
                <span className="rounded-full border border-white/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
                  {tender.reference}
                </span>
              </div>
              <h1
                className="mt-3 max-w-[840px] text-[28px] font-black leading-[1.02] tracking-[-0.03em] text-white sm:text-[38px]"
                style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
              >
                {title}
              </h1>
              {tender.ugeaName ? <p className="mt-3 text-sm font-semibold text-white/70">{tender.ugeaName}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <article className="min-w-0">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" aria-hidden />
              {tender.province ?? "Moçambique"}
              {tender.openedAt ? ` · Abertura ${formatDayMonth(tender.openedAt)}` : ""}
            </p>

            {tender.generalObject || tender.description ? (
              <div className="mt-5 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">ACERCA DO CONCURSO</p>
                <div className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#0F1A2E]/80">
                  {tender.generalObject ?? tender.description}
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">DADOS DO CONCURSO</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <DetailRow label="Referência" value={tender.reference} />
                <DetailRow label="Entidade" value={tender.ugeaName} />
                <DetailRow label="Província" value={tender.province} />
                <DetailRow label="Regime" value={tender.regime} />
                <DetailRow label="Modalidade" value={tender.modality} />
                <DetailRow label="Classe" value={tender.class} />
                <DetailRow label="Nº de Lotes" value={tender.lotCount} />
                <DetailRow label="Critério de adjudicação" value={tender.awardCriteria} />
                <DetailRow label="Entrega de propostas" value={tender.proposalDelivery} />
                <DetailRow label="Hora de entrega" value={tender.deliveryTime} />
                <DetailRow label="Hora de abertura" value={tender.openingTime} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 rounded-[20px] border border-[#D9D2C2] bg-white p-5 sm:grid-cols-3">
              <DetailRow label="Publicação" value={tender.publishedAt ? formatFull(tender.publishedAt) : undefined} />
              <DetailRow label="Lançamento" value={tender.launchedAt ? formatDayMonth(tender.launchedAt) : undefined} />
              <DetailRow label="Abertura" value={tender.openedAt ? formatDayMonth(tender.openedAt) : undefined} />
            </div>

            {tender.observations ? (
              <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">OBSERVAÇÕES</p>
                <p className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#0F1A2E]/80">{tender.observations}</p>
              </div>
            ) : null}

            {hasDocuments ? (
              <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">DOCUMENTOS</p>
                <ul className="mt-3 space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-[12px] border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 text-sm font-semibold text-[#0F1A2E] transition-colors hover:border-[#0B5E56]/40 hover:bg-white"
                      >
                        <span className="min-w-0 truncate">
                          {doc.name || (doc.type === "notice" ? "Anúncio" : "Documento do concurso")}
                        </span>
                        <span aria-hidden className="shrink-0 text-[#0B5E56]">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/40">REFERÊNCIA</p>
              <p className="mt-2 font-mono text-sm font-bold tracking-wide text-[#0F1A2E]/80">{tender.reference}</p>
              {estimatedValue ? (
                <p className="mt-4 font-black tracking-tight text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                  {estimatedValue}
                </p>
              ) : null}
              {provisionalGuarantee ? (
                <p className="mt-1 text-[13px] text-[#0F1A2E]/60">Garantia provisória: <span className="font-bold text-[#0F1A2E]">{provisionalGuarantee}</span></p>
              ) : null}
              {tender.currency ? <p className="mt-1 text-[13px] text-[#0F1A2E]/60">Moeda: <span className="font-bold text-[#0F1A2E]">{tender.currency}</span></p> : null}

              <div className="mt-5 border-t border-[#D9D2C2] pt-5">
                <p className="text-sm font-black text-[#0F1A2E]">{tender.ugeaName ?? "Entidade pública"}</p>
                {tender.province ? <p className="mt-0.5 text-sm text-[#0F1A2E]/60">{tender.province}</p> : null}
              </div>

              <div className="mt-5">
                {tender.detailsUrl ? (
                  <a
                    href={tender.detailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white transition-colors hover:bg-black"
                  >
                    Ver no portal UFSA <span aria-hidden>↗</span>
                  </a>
                ) : null}
                <Link href="/concursos" className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[#0F1A2E]/15 bg-white px-5 text-sm font-semibold text-[#0F1A2E] hover:bg-[#F6F3EE]">
                  ← Todos os concursos
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}