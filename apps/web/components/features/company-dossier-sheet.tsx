"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FiMapPin, FiMessageCircle, FiStar } from "react-icons/fi";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { getPublicProfileAction } from "@/app/actions/profiles";
import type { PublicProfileView } from "@workdeal/shared";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string | null;
  fallbackName: string | null;
  onNegotiate: () => void;
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  phone: "Telefone",
  email: "Email",
  website: "Website",
};

/** Ficha da empresa proponente — o que precisas de saber para decidir. */
export function CompanyDossierSheet({ open, onOpenChange, slug, fallbackName, onNegotiate }: Props) {
  const [profile, setProfile] = useState<PublicProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    getPublicProfileAction(slug)
      .then((p) => {
        if (!cancelled) {
          if (!p) setError("Ficha indisponível para este perfil.");
          setProfile(p);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar a ficha.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, slug]);

  const location = profile?.location
    ? [profile.location.district, profile.location.province].filter(Boolean).join(" · ")
    : null;
  const avg = profile?.reviews.average ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[94vw] overflow-y-auto bg-white p-0 sm:max-w-lg">
        <SheetHeader className="sr-only">
          <SheetTitle>Ficha da empresa</SheetTitle>
          <SheetDescription>Informação pública do perfil proponente.</SheetDescription>
        </SheetHeader>

        {!slug ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-black text-[#0F1A2E]">{fallbackName ?? "Fornecedor"}</p>
            <p className="text-xs leading-relaxed text-[#0F1A2E]/55">
              Este proponente ainda não tem página pública — a negociação continua disponível no chat.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center gap-4">
              <div className="size-16 animate-pulse rounded-2xl bg-[#F6F3EE]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#F6F3EE]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[#F6F3EE]" />
              </div>
            </div>
            <div className="h-24 animate-pulse rounded-2xl bg-[#F6F3EE]" />
            <div className="h-24 animate-pulse rounded-2xl bg-[#F6F3EE]" />
          </div>
        ) : error || !profile ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm font-black text-[#0F1A2E]">Não foi possível carregar a ficha</p>
            <p className="text-xs text-[#0F1A2E]/55">{error ?? "Tenta novamente."}</p>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full border border-[#D9D2C2] px-4 py-2 text-xs font-bold text-[#0F1A2E]"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="pb-6">
            {/* Selo: identidade + reputação */}
            <div className="border-b border-[#D9D2C2] bg-[#0F1A2E] px-6 pb-6 pt-8 text-white">
              <div className="flex items-start gap-4">
                <span className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-black text-[#0F1A2E]">
                  {profile.logoUrl ? (
                    <Image src={profile.logoUrl} alt={`Logótipo de ${profile.name}`} fill sizes="64px" className="object-cover" />
                  ) : (
                    (profile.name ?? "?").slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black leading-tight tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                    {profile.name}
                  </h2>
                  {profile.tagline && <p className="mt-0.5 text-[13px] text-white/70">{profile.tagline}</p>}
                  {location && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-white/55">
                      <FiMapPin className="size-3.5 shrink-0" aria-hidden /> {location}
                    </p>
                  )}
                </div>
                {avg != null && (
                  <span className="flex shrink-0 flex-col items-center rounded-2xl bg-white px-3 py-2 text-[#0F1A2E]">
                    <span className="flex items-center gap-1 text-base font-black tabular-nums">
                      <FiStar className="size-4 fill-[#D97706] text-[#D97706]" aria-hidden />
                      {avg.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-semibold text-[#0F1A2E]/55">
                      {profile.reviews.count} avaliaç{profile.reviews.count === 1 ? "ão" : "ões"}
                    </span>
                  </span>
                )}
              </div>
              {profile.badges.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {profile.badges.map((b) => (
                    <span key={b.id} title={b.description ?? undefined} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/20">
                      {b.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5 px-6 pt-5">
              {profile.description && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/45">Sobre a empresa</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#0F1A2E]/75">{profile.description}</p>
                </section>
              )}

              {(profile.qualification?.foundedYear != null ||
                profile.qualification?.companySize ||
                profile.qualification?.workers != null) && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/45">Dimensão</h3>
                  <dl className="mt-1.5 grid grid-cols-3 gap-2">
                    {profile.qualification?.foundedYear != null && (
                      <div className="rounded-xl bg-[#F6F3EE] px-3 py-2">
                        <dt className="text-[10px] font-semibold text-[#0F1A2E]/50">Desde</dt>
                        <dd className="text-sm font-black tabular-nums text-[#0F1A2E]">{profile.qualification.foundedYear}</dd>
                      </div>
                    )}
                    {profile.qualification?.companySize && (
                      <div className="rounded-xl bg-[#F6F3EE] px-3 py-2">
                        <dt className="text-[10px] font-semibold text-[#0F1A2E]/50">Porte</dt>
                        <dd className="truncate text-sm font-black text-[#0F1A2E]">{profile.qualification.companySize}</dd>
                      </div>
                    )}
                    {profile.qualification?.workers != null && (
                      <div className="rounded-xl bg-[#F6F3EE] px-3 py-2">
                        <dt className="text-[10px] font-semibold text-[#0F1A2E]/50">Equipa</dt>
                        <dd className="text-sm font-black tabular-nums text-[#0F1A2E]">{profile.qualification.workers}</dd>
                      </div>
                    )}
                  </dl>
                </section>
              )}

              {profile.categories.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/45">Áreas de actuação</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.categories.map((c) => (
                      <span key={c.id} className="rounded-full border border-[#0B5E56]/25 bg-[#0B5E56]/5 px-2.5 py-1 text-xs font-semibold text-[#0B5E56]">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {profile.services.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/45">
                    Serviços ({profile.services.length})
                  </h3>
                  <ul className="mt-1.5 space-y-1.5">
                    {profile.services.slice(0, 6).map((s) => (
                      <li key={s.id} className="flex items-baseline justify-between gap-3 rounded-xl border border-[#D9D2C2] px-3 py-2">
                        <span className="truncate text-[13px] font-semibold text-[#0F1A2E]">{s.title}</span>
                        {s.priceMzn != null && (
                          <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-[#0F1A2E]/70">
                            {s.priceMzn.toLocaleString("pt-MZ")} MZN
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {profile.contactVerifications.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/45">Contactos verificados</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.contactVerifications.map((c) => (
                      <span key={`${c.channel}:${c.identifier}`} className="rounded-full bg-[#F6F3EE] px-2.5 py-1 text-[11px] font-semibold text-[#0F1A2E]/65 ring-1 ring-[#D9D2C2]">
                        {CHANNEL_LABELS[c.channel] ?? c.channel} ✓
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <div className="flex gap-2 pt-1">
                <Link
                  href={`/profiles/${profile.slug}`}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 text-sm font-bold text-[#0F1A2E] transition-colors hover:bg-[#F6F3EE]"
                >
                  Ver perfil completo
                </Link>
                <button
                  type="button"
                  onClick={onNegotiate}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#0B5E56] px-4 text-sm font-bold text-white transition-colors hover:bg-[#094d46]"
                >
                  <FiMessageCircle className="size-4" aria-hidden /> Negociar
                </button>
              </div>
              <p className="text-center text-[11px] leading-relaxed text-[#0F1A2E]/45">
                A negociação corre no chat da tarefa — contactos directos por mensagem são bloqueados por segurança.
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
