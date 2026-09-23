"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerForEvent, cancelMyRegistration } from "@/app/actions/events";

type MyStatus = "registered" | "checked_in" | "interested" | null;

type Props = {
  eventId: string;
  authed: boolean;
  next: string;
  alreadyRegistered: boolean;
  spotsLeft: number | null;
  started: boolean;
  /** Sem data marcada: não há inscrição, há manifestação de interesse. */
  dateless?: boolean;
  /** Estado actual do utilizador (inclui "interested"). */
  myStatus?: MyStatus;
};

export function EventRegisterButton({ eventId, authed, next, alreadyRegistered, spotsLeft, started, dateless = false, myStatus = null }: Props) {
  const router = useRouter();
  const [registered, setRegistered] = useState(alreadyRegistered);
  const [interested, setInterested] = useState(myStatus === "interested");
  const [busy, setBusy] = useState(false);

  const full = spotsLeft != null && spotsLeft <= 0 && !registered;

  function refresh() {
    router.refresh();
  }

  if (!authed) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors"
      >
        {dateless ? "Iniciar sessão para manifestar interesse" : "Iniciar sessão para me inscrever"}
      </Link>
    );
  }

  if (started) {
    return (
      <div className="rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-5 py-4 text-center">
        <p className="text-sm font-bold text-[#0F1A2E]">O evento já começou</p>
        <p className="mt-1 text-xs text-[#0F1A2E]/60">As inscrições encerram no início do evento.</p>
      </div>
    );
  }

  async function withdrawInterest() {
    setBusy(true);
    try {
      await cancelMyRegistration(eventId);
      setInterested(false);
      toast.success("Interesse retirado.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível retirar o interesse.");
    } finally {
      setBusy(false);
    }
  }

  // Interesse manifestado num evento ainda sem data
  if (interested && dateless) {
    return (
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#0B5E56] px-4 py-2 text-sm font-bold text-white">
          <span className="size-1.5 rounded-full bg-white" aria-hidden /> Interesse manifestado
        </p>
        <p className="text-xs text-[#0F1A2E]/60">Avisamos-te quando a data for marcada.</p>
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void withdrawInterest()}
            className="inline-flex h-9 items-center rounded-full border border-[#D9D2C2] px-4 text-xs font-semibold text-[#0F1A2E]/70 hover:bg-white disabled:opacity-50"
          >
            {busy ? "A retirar…" : "Retirar interesse"}
          </button>
        </div>
      </div>
    );
  }

  // Interesse manifestado e a data já foi marcada → pode converter em inscrição
  if (interested && !dateless) {
    return (
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#0B5E56]/10 px-4 py-2 text-sm font-bold text-[#0B5E56]">
          <span className="size-1.5 rounded-full bg-[#0B5E56]" aria-hidden /> A data foi marcada!
        </p>
        <button
          type="button"
          disabled={busy || full}
          onClick={() => {
            setBusy(true);
            registerForEvent(eventId)
              .then(() => {
                setInterested(false);
                setRegistered(true);
                toast.success("Inscrição confirmada!");
                refresh();
              })
              .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível inscrever."))
              .finally(() => setBusy(false));
          }}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors disabled:cursor-not-allowed disabled:bg-[#D9D2C2] disabled:shadow-none"
        >
          {busy ? "A registar…" : full ? "Sem vagas" : "Confirmar inscrição"}
        </button>
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void withdrawInterest()}
            className="inline-flex h-9 items-center rounded-full border border-[#D9D2C2] px-4 text-xs font-semibold text-[#0F1A2E]/70 hover:bg-white disabled:opacity-50"
          >
            {busy ? "A retirar…" : "Retirar interesse"}
          </button>
        </div>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="space-y-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#0B5E56] px-4 py-2 text-sm font-bold text-white">
          <span className="size-1.5 rounded-full bg-white" aria-hidden /> Inscrição confirmada
        </p>
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              cancelMyRegistration(eventId)
                .then(() => {
                  setRegistered(false);
                  toast.success("Inscrição cancelada.");
                  refresh();
                })
                .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a inscrição."))
                .finally(() => setBusy(false));
            }}
            className="inline-flex h-9 items-center rounded-full border border-[#D9D2C2] px-4 text-xs font-semibold text-[#0F1A2E]/70 hover:bg-white disabled:opacity-50"
          >
            {busy ? "A cancelar…" : "Cancelar inscrição"}
          </button>
        </div>
      </div>
    );
  }

  // Sem data: manifestar interesse (não consome lotação)
  if (dateless) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            registerForEvent(eventId)
              .then(() => {
                setInterested(true);
                toast.success("Interesse manifestado! Avisamos-te quando houver data.");
                refresh();
              })
              .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível manifestar interesse."))
              .finally(() => setBusy(false));
          }}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#0F1A2E] px-6 text-sm font-bold text-white hover:bg-black transition-colors disabled:opacity-50"
        >
          {busy ? "A registar…" : "Manifestar interesse"}
        </button>
        <p className="text-xs text-[#0F1A2E]/55">Sem compromisso — a inscrição abre quando a data for marcada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy || full}
        onClick={() => {
          setBusy(true);
          registerForEvent(eventId)
            .then(() => {
              setRegistered(true);
              toast.success("Inscrição confirmada!");
              refresh();
            })
            .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível inscrever."))
            .finally(() => setBusy(false));
        }}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors disabled:cursor-not-allowed disabled:bg-[#D9D2C2] disabled:shadow-none"
      >
        {busy ? "A registar…" : full ? "Sem vagas" : "Registar-me"}
      </button>
      {full ? <p className="text-xs text-[#0F1A2E]/55">Todas as vagas preenchidas.</p> : null}
    </div>
  );
}
