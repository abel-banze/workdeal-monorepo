"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, Inbox, ShieldCheck, TriangleAlert } from "lucide-react";
import { acceptAdminInvite } from "@/app/actions/admin";

const DISPLAY_FONT = "var(--font-display)";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  moderator: "Moderador",
};

type AcceptState = "idle" | "busy" | "success" | "error";

export function AcceptInvite({ token }: { token: string }) {
  const [state, setState] = React.useState<AcceptState>("idle");
  const [error, setError] = React.useState<string>("");
  const [role, setRole] = React.useState<string>("moderator");

  async function accept() {
    setState("busy");
    setError("");
    try {
      const res = await acceptAdminInvite(token);
      if (!res.success) {
        setError(res.error?.message ?? "Não foi possível aceitar o convite");
        setState("error");
        return;
      }
      const record = res.data as { role: string } | null;
      if (record?.role) setRole(record.role);
      setState("success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Não foi possível aceitar o convite";
      setError(msg);
      setState("error");
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-sm">
        <div className="border-b border-[#D9D2C2] bg-[#F6F3EE] px-6 py-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
            Workdeal · Painel da equipa
          </p>
          <h1
            className="mt-2 text-xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Aceitar convite
          </h1>
        </div>

        <div className="px-6 py-6">
          {state === "idle" && (
            <>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#0B5E56]/10">
                <ShieldCheck className="size-6 text-[#0B5E56]" />
              </span>
              <p className="mt-4 text-sm text-[#0F1A2E]/70">
                Recebeste um convite para ajudar a moderar a plataforma. Ao aceitares, a tua conta passa a ter acesso
                ao painel da equipa — esta acção é reversível pela administração.
              </p>
              <button
                type="button"
                onClick={() => void accept()}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F1A2E] text-sm font-semibold text-white transition hover:bg-[#0B5E56]"
              >
                Aceitar convite <ChevronRight className="size-4" />
              </button>
            </>
          )}

          {state === "busy" && (
            <p className="py-6 text-center text-sm text-[#0F1A2E]/55">A validar o convite…</p>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#0B5E56]/10">
                <CheckCircle2 className="size-6 text-[#0B5E56]" />
              </span>
              <p className="mt-4 text-lg font-black tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: DISPLAY_FONT }}>
                Convite aceite!
              </p>
              <p className="mt-1 text-sm text-[#0F1A2E]/60">
                A partir de agora a tua conta tem o papel de{" "}
                <span className="font-semibold text-[#0B5E56]">{ROLE_LABEL[role] ?? "membro da equipa"}</span> no painel.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0F1A2E] text-sm font-semibold text-white transition hover:bg-[#0B5E56]"
              >
                Ir para o painel <ChevronRight className="size-4" />
              </Link>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FF3B1F]/10">
                <TriangleAlert className="size-6 text-[#FF3B1F]" />
              </span>
              <p className="mt-4 text-sm font-medium text-[#0F1A2E]">Não foi possível aceitar</p>
              <p className="mt-1 text-sm text-[#0F1A2E]/60">{error}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#B27300]/30 bg-[#B27300]/[0.08] px-3 py-1 text-[11px] font-medium text-[#B27300]">
                <Inbox className="size-3.5" /> Entra com a conta Workdeal do email convidado
              </span>
              <button
                type="button"
                onClick={() => void accept()}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D9D2C2] text-sm font-semibold text-[#0F1A2E] transition hover:border-[#0B5E56]/40 hover:text-[#0B5E56]"
              >
                Tentar de novo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}