import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug } from "@/lib/directory";
import { getServerSession } from "@/lib/auth";
import { formatEventWhen, formatFull } from "@/lib/dates";
import { EventRegisterButton } from "@/components/features/event-register-button";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await getEventBySlug(slug);
    if (!data) return { title: "Evento — Workdeal" };
    return {
      title: `${data.title} — Workdeal`,
      description: data.description.slice(0, 160),
      openGraph: data.coverImage ? { images: [data.coverImage] } : undefined,
    };
  } catch {
    return { title: "Evento — Workdeal" };
  }
}

export default async function PublicEventPage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession().catch(() => null);

  let event;
  try {
    const res = await getEventBySlug(slug);
    event = res.data;
  } catch {
    event = null;
  }
  if (!event) notFound();

  const when = formatEventWhen(event.startAt, event.endAt);
  const started = new Date(event.startAt) <= new Date();
  const spotsLeft = event.capacity != null ? event.capacity - (event.registrationCount ?? 0) : null;
  const alreadyRegistered = event.myRegistration === "registered" || event.myRegistration === "checked_in";
  const organizerHref = event.organizerSlug ? `/profiles/${event.organizerSlug}` : null;
  const location = event.isOnline ? "Online" : [event.venueName, event.province, event.district].filter(Boolean).join(" · ") || "Local a definir";

  return (
    <div className="bg-[#F6F3EE]">
      <section className="border-b border-[#D9D2C2] bg-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-[0.14em]">
            <Link href="/" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Início
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <Link href="/events" className="text-[#0F1A2E]/40 hover:text-[#0F1A2E]">
              Eventos
            </Link>
            <span className="text-[#D9D2C2]">/</span>
            <span className="text-[#0B5E56]">EVENTO</span>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-[#0F1A2E]">
            {event.coverImage ? (
              <div className="relative h-56 w-full sm:h-80">
                <Image src={event.coverImage} alt={`${event.title} — capa`} fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" priority />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#0F1A2E]/70 via-transparent to-transparent" />
              </div>
            ) : (
              <div className="relative flex h-56 w-full items-end sm:h-72">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.06]"
                  style={{
                    backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
                    backgroundSize: "32px 32px",
                  }}
                />
                <p className="relative px-6 pb-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">Evento • Workdeal</p>
              </div>
            )}
            <div className="relative -mt-14 px-5 pb-5 sm:px-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FF3B1F] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                  {event.isOnline ? "Online" : "Presencial"}
                </span>
                {event.status === "cancelled" ? (
                  <span className="rounded-full bg-[#0F1A2E] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">Cancelado</span>
                ) : null}
              </div>
              <h1
                className="mt-2 max-w-[820px] text-[34px] font-black leading-[0.95] tracking-[-0.04em] text-white sm:text-[46px]"
                style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
              >
                {event.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <article className="min-w-0">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">
              <span className="size-1.5 rounded-full bg-[#FF3B1F]" aria-hidden />
              {when}
            </p>

            <div className="mt-5 grid gap-4 rounded-[20px] border border-[#D9D2C2] bg-white p-5 sm:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Local</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{location}</p>
                {event.isOnline && event.onlineUrl ? (
                  <a href={event.onlineUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-[#0B5E56] hover:underline">
                    Aceder ao evento → ↗
                  </a>
                ) : null}
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/40">Publicado</p>
                <p className="mt-1 text-sm font-black text-[#0F1A2E]">{formatFull(event.createdAt)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0B5E56]">SOBRE O EVENTO</p>
              <div className="mt-3 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#0F1A2E]/80">{event.description}</div>
            </div>

            {organizerHref && event.organizerName ? (
              <Link href={organizerHref} className="mt-6 flex items-center gap-4 rounded-[20px] border border-[#D9D2C2] bg-white p-5 hover:border-[#0B5E56]/30">
                <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] text-base font-black text-[#0F1A2E]">
                  {event.organizerLogo ? <Image src={event.organizerLogo} alt="" fill sizes="56px" className="object-cover" /> : event.organizerName.slice(0, 2).toUpperCase()}
                </div>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0F1A2E]/45">Organizado por</span>
                  <span className="block truncate text-lg font-black tracking-tight text-[#0F1A2E]">{event.organizerName}</span>
                  <span className="block text-xs text-[#0B5E56] font-bold">Ver perfil →</span>
                </span>
              </Link>
            ) : null}
          </article>

          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[20px] border border-[#D9D2C2] bg-white p-6">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0F1A2E]/40">INSCRIÇÃO</p>
              <h2 className="mt-2 text-lg font-black tracking-tight text-[#0F1A2E]">{event.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#0F1A2E]/60">
                {spotsLeft != null
                  ? spotsLeft > 0
                    ? `${spotsLeft} ${spotsLeft === 1 ? "vaga restante" : "vagas restantes"}`
                    : "Evento sem vagas"
                  : `${event.registrationCount ?? 0} ${(event.registrationCount ?? 0) === 1 ? "pessoa inscrita" : "pessoas inscritas"}`}
                {started ? " • já começou" : ""}
              </p>

              <div className="mt-4">
                {event.status === "cancelled" ? (
                  <div className="rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-5 py-4 text-center text-sm font-bold text-[#0F1A2E]/50">Evento cancelado</div>
                ) : (
                  <EventRegisterButton
                    eventId={event.id}
                    authed={Boolean(session)}
                    next={`/events/${event.slug}`}
                    alreadyRegistered={alreadyRegistered}
                    spotsLeft={spotsLeft}
                    started={started}
                  />
                )}
                {!session ? (
                  <p className="mt-3 text-center text-[11px] text-[#0F1A2E]/45">
                    Novo?{" "}
                    <Link href="/signup" className="font-bold text-[#0B5E56] hover:underline">
                      Criar conta grátis
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}