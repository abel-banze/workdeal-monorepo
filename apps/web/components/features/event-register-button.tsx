"use client"

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerForEvent, cancelMyRegistration } from "@/app/actions/events";

type Props = {
  eventId: string;
  authed: boolean;
  next: string;
  alreadyRegistered: boolean;
  spotsLeft: number | null;
  started: boolean;
};

export function EventRegisterButton({ eventId, authed, next, alreadyRegistered, spotsLeft, started }: Props) {
  const router = useRouter();
  const [registered, setRegistered] = useState(alreadyRegistered);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = spotsLeft != null && spotsLeft <= 0 && !registered;

  if (!authed) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors"
      >
        Iniciar sessão para me inscrever
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
              setError(null);
              cancelMyRegistration(eventId)
                .then(() => {
                  setRegistered(false);
                  router.refresh();
                })
                .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível cancelar a inscrição."))
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={busy || full}
        onClick={() => {
          setBusy(true);
          setError(null);
          registerForEvent(eventId)
            .then(() => {
              setRegistered(true);
              router.refresh();
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Não foi possível inscrever."))
            .finally(() => setBusy(false));
        }}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#FF3B1F] px-6 text-sm font-bold text-white shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_4px_12px_rgba(255,59,31,0.25)] hover:bg-[#E8350F] transition-colors disabled:cursor-not-allowed disabled:bg-[#D9D2C2] disabled:shadow-none"
      >
        {busy ? "A registar…" : full ? "Sem vagas" : "Registar-me"}
      </button>
      {full ? <p className="text-xs text-[#0F1A2E]/55">Todas as vagas preenchidas.</p> : null}
      {error ? <p className="rounded-xl bg-[#FFF1EF] px-3 py-2 text-xs font-semibold text-[#FF3B1F]">{error}</p> : null}
    </div>
  );
}