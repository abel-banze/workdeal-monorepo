import Link from "next/link";
import Image from "next/image";
import type { EventView, EventRegistrationStatus } from "@workdeal/shared";
import { formatEventWhen, formatDayMonth } from "@/lib/dates";

export function EventCard({ event, categoryName, allowPast = true }: { event: EventView; categoryName?: string | null; allowPast?: boolean }) {
  const when = formatEventWhen(event.startAt, event.endAt);
  const isPast = new Date(event.endAt) < new Date();
  if (isPast && !allowPast) return null;
  const location = event.isOnline ? "Online" : event.venueName || [event.province, event.district].filter(Boolean).join(" · ") || "Local a definir";
  const spotsLeft = event.capacity != null ? event.capacity - (event.registrationCount ?? 0) : null;
  const myReg = (event as { myRegistration?: EventRegistrationStatus | null }).myRegistration;

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[#D9D2C2] bg-white transition-all hover:border-[#0B5E56]/25 hover:shadow-[0_12px_40px_rgba(15,26,46,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30"
    >
      {/* capa */}
      <div className="relative h-40 w-full overflow-hidden bg-[#0F1A2E]">
        {event.coverImage ? (
          <Image src={event.coverImage} alt="" fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
              backgroundSize: "28px 28px",
            }}
          />
        )}
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[#0F1A2E]/85 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
          <span className="size-1 rounded-full bg-[#FF3B1F]" aria-hidden />
          {event.isOnline ? "Evento online" : categoryName ?? "Evento"}
        </span>
        {myReg && myReg !== "cancelled" ? (
          <span className="absolute right-4 top-4 rounded-full bg-[#0B5E56] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
            {myReg === "checked_in" ? "Presente ✓" : "Inscrito"}
          </span>
        ) : null}
        {isPast ? <span className="absolute right-4 top-4 rounded-full bg-[#F6F3EE]/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#0F1A2E]/60">Terminou</span> : null}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4">
        <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#0B5E56]">{when}</p>
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <h3
            className="line-clamp-2 flex-1 text-[18px] font-black leading-tight tracking-[-0.03em] text-[#0F1A2E]"
            style={{ fontFamily: "var(--font-display), ui-serif, Georgia, serif" }}
          >
            {event.title}
          </h3>
          <span
            className="hidden shrink-0 flex-col items-center rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-2.5 py-1 text-center sm:flex"
            aria-hidden
          >
            <span className="font-sans text-[16px] font-black leading-none text-[#FF3B1F]">{formatDayMonth(event.startAt).split(" ")[0]}</span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#0F1A2E]/50">{formatDayMonth(event.startAt).split(" ")[1]}</span>
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-[13px] text-[#0F1A2E]/60">{location}</p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#D9D2C2]/60 bg-[#F6F3EE]/70 px-5 py-3">
        <div className="min-w-0">
          {event.organizerName ? (
            <p className="truncate text-xs font-semibold text-[#0F1A2E]/70">
              por <span className="font-bold text-[#0F1A2E]">{event.organizerName}</span>
            </p>
          ) : (
            <p className="text-xs text-[#0F1A2E]/50">Organizador a confirmar</p>
          )}
          <p className="mt-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0F1A2E]/45">
            {spotsLeft != null ? (spotsLeft > 0 ? `${spotsLeft} vagas` : "Sem vagas") : `${event.registrationCount ?? 0} inscritos`}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#0B5E56] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver evento <span aria-hidden>→</span>
        </span>
      </div>
    </Link>
  );
}