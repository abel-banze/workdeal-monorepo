"use client";

import { useState, useCallback } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FiPhone, FiMail, FiGlobe, FiCopy, FiExternalLink, FiCheck } from "react-icons/fi";
import { BsShieldCheck } from "react-icons/bs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { trackEvent } from "@/components/features/analytics";

type ContactProps = {
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  name: string;
  profileId?: string;
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full border-[#D9D2C2] bg-white"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <FiCheck className="size-4" /> : <FiCopy className="size-4" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

function EmailForm({ to, profileName, profileId }: { to: string; profileName: string; profileId?: string }) {
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!fromName.trim() || fromName.trim().length < 2) { setErr("Indique o seu nome."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) { setErr("Email inválido."); return; }
    if (message.trim().length < 10) { setErr("Mensagem deve ter ≥10 caracteres."); return; }
    setStatus("sending");
    try {
      const { sendContactEmail } = await import("@/app/actions/contact");
      const res = await sendContactEmail({ to, fromName: fromName.trim(), fromEmail: fromEmail.trim(), message: message.trim(), profileName });
      if (!res.ok) { setStatus("error"); setErr(res.error ?? "Falha ao enviar."); return; }
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setErr(e instanceof Error ? e.message : "Falha ao enviar.");
    }
  }

  if (status === "ok") {
    return (
      <div className="mt-4 rounded-2xl bg-[#0B5E56]/10 border border-[#0B5E56]/20 px-4 py-6 text-center">
        <p className="text-sm font-bold text-[#0B5E56]">Mensagem enviada ✓</p>
        <p className="mt-1 text-xs text-[#0F1A2E]/60">A empresa vai responder para {fromEmail}. Também pode copiar o email acima.</p>
        <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => { setStatus("idle"); setMessage(""); }}>Enviar outra</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-bold tracking-[0.08em] text-[#0F1A2E]/60 uppercase">Seu nome</label>
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Ex: João Silva" className="mt-1.5 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-bold tracking-[0.08em] text-[#0F1A2E]/60 uppercase">Seu email</label>
          <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="voce@empresa.co.mz" className="mt-1.5 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 outline-none" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-bold tracking-[0.08em] text-[#0F1A2E]/60 uppercase">Mensagem</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={`Olá ${profileName}, vi o vosso perfil no Workdeal e gostaria de...`} rows={4} className="mt-1.5 w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 outline-none resize-none" />
      </div>
      {err ? <p className="rounded-xl bg-[#FF3B1F]/10 border border-[#FF3B1F]/20 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{err}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={status === "sending"} className="h-11 flex-1 rounded-full bg-[#0B5E56] px-4 text-sm font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">
          {status === "sending" ? "A enviar..." : "Enviar mensagem"}
        </Button>
        <a href={`mailto:${to}?subject=${encodeURIComponent(`Contacto via Workdeal — ${profileName}`)}`} onClick={() => { if (profileId) trackEvent({ profileId, eventType: "email_click" }); }} className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 text-sm font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]">
          Abrir app
        </a>
      </div>
      <p className="text-center font-mono text-[11px] text-[#0F1A2E]/40">Resposta vai para o seu email · Sem spam</p>
    </form>
  );
}

export function ProfileContacts({ whatsapp, phone, email, website, name, profileId }: ContactProps) {
  const wa = whatsapp ?? phone ?? "+258820000000";
  const waDigits = wa.replace(/\D/g, "");
  const tel = phone ?? "+258840000000";
  const mail = email ?? "geral@empresa.co.mz";

  const trackWhatsApp = useCallback(() => { if (profileId) trackEvent({ profileId, eventType: "whatsapp_click" }); }, [profileId]);
  const trackPhone = useCallback(() => { if (profileId) trackEvent({ profileId, eventType: "phone_click" }); }, [profileId]);
  const trackEmail = useCallback(() => { if (profileId) trackEvent({ profileId, eventType: "email_click" }); }, [profileId]);
  const trackWebsite = useCallback(() => { if (profileId) trackEvent({ profileId, eventType: "website_click" }); }, [profileId]);

  return (
    <div className="space-y-3">
      {/* WhatsApp — destaque Work */}
      <Dialog>
        <DialogTrigger className="flex w-full items-center gap-3 rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56] px-4 py-3.5 text-left text-white shadow-sm transition hover:bg-[#0A4A44] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/30">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
            <FaWhatsapp className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-none">WhatsApp</span>
            <span className="font-mono text-xs font-normal text-white/80">{wa}</span>
          </span>
          <FiExternalLink className="size-4 shrink-0 text-white/60" aria-hidden />
        </DialogTrigger>
        <DialogContent className="max-w-[420px] rounded-[20px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#0B5E56]/10 text-[#0B5E56]">
              <FaWhatsapp className="size-6" />
            </div>
            <DialogTitle className="mt-3 text-center text-[18px] font-black tracking-[-0.02em] text-[#0F1A2E]">Abrir WhatsApp?</DialogTitle>
            <DialogDescription className="text-center text-sm text-[#0F1A2E]/60">
              Vai falar directamente com <span className="font-semibold text-[#0F1A2E]">{name}</span> no número abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
            <span className="font-mono text-sm font-bold text-[#0F1A2E]">{wa}</span>
            <CopyButton value={wa} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackWhatsApp}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B5E56] px-4 py-3 text-sm font-bold text-white hover:bg-[#0A4A44]"
            >
              <FaWhatsapp className="size-4" /> Abrir WhatsApp
            </a>
            <a
              href={`https://wa.me/${waDigits}?text=${encodeURIComponent(`Olá ${name}, vim pelo Workdeal.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackWhatsApp}
              className="inline-flex items-center justify-center rounded-full border border-[#D9D2C2] bg-white px-4 py-3 text-sm font-bold text-[#0F1A2E] hover:bg-[#F6F3EE]"
            >
              Mensagem pronta
            </a>
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] text-[#0F1A2E]/40">
            <BsShieldCheck className="size-3" /> Conversa fora da plataforma — confirme identidade
          </p>
        </DialogContent>
      </Dialog>

      {/* Telefone */}
      <Dialog>
        <DialogTrigger className="flex w-full items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3.5 text-left transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#D9D2C2] text-[#0F1A2E]">
            <FiPhone className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-none text-[#0F1A2E]">Telefone</span>
            <span className="font-mono text-xs text-[#0F1A2E]/60">{tel}</span>
          </span>
          <FiExternalLink className="size-4 shrink-0 text-[#0F1A2E]/30" aria-hidden />
        </DialogTrigger>
        <DialogContent className="max-w-[420px] rounded-[20px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#F6F3EE] border border-[#D9D2C2] text-[#0F1A2E]">
              <FiPhone className="size-6" />
            </div>
            <DialogTitle className="mt-3 text-center text-[18px] font-black text-[#0F1A2E]">Ligar para a empresa?</DialogTitle>
            <DialogDescription className="text-center text-sm text-[#0F1A2E]/60">
              Chamada directa para {name}. Tenha NUIT e alvará à mão para validação.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
            <span className="font-mono text-sm font-bold text-[#0F1A2E]">{tel}</span>
            <CopyButton value={tel} />
          </div>
          <a href={`tel:${tel}`} onClick={trackPhone} className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#0F1A2E] px-5 py-3 text-sm font-bold text-white hover:bg-black">
            <FiPhone className="size-4" /> Ligar agora
          </a>
        </DialogContent>
      </Dialog>

      {/* Email — com form para enviar daqui + copiar */}
      <Dialog>
        <DialogTrigger className="flex w-full items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-white px-4 py-3.5 text-left transition hover:bg-[#F6F3EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F6F3EE] border border-[#D9D2C2] text-[#0F1A2E]">
            <FiMail className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-none text-[#0F1A2E]">Email</span>
            <span className="truncate font-mono text-xs text-[#0F1A2E]/60">{mail}</span>
          </span>
          <FiCopy className="size-4 shrink-0 text-[#0F1A2E]/30" aria-hidden />
        </DialogTrigger>
        <DialogContent className="max-w-[460px] rounded-[20px] border-[#D9D2C2] bg-white p-6">
          <DialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#F6F3EE] border border-[#D9D2C2] text-[#0F1A2E]">
              <FiMail className="size-6" />
            </div>
            <DialogTitle className="mt-3 text-center text-[18px] font-black text-[#0F1A2E]">Enviar email à empresa</DialogTitle>
            <DialogDescription className="text-center text-sm text-[#0F1A2E]/60">
              Escreva aqui e enviamos para <span className="font-semibold text-[#0F1A2E]">{mail}</span> via Workdeal.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-2.5">
            <span className="truncate font-mono text-xs font-bold text-[#0F1A2E]">{mail}</span>
            <CopyButton value={mail} />
          </div>

          <EmailForm to={mail} profileName={name} profileId={profileId} />
        </DialogContent>
      </Dialog>

      {/* Website — directo, sem dialog se tiver */}
      {website ? (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackWebsite}
          className="flex items-center gap-3 rounded-2xl border border-[#0B5E56]/15 bg-[#0B5E56]/5 px-4 py-3.5 transition hover:bg-[#0B5E56]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white border border-[#0B5E56]/15 text-[#0B5E56]">
            <FiGlobe className="size-[18px]" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-none text-[#0B5E56]">Website</span>
            <span className="truncate text-xs text-[#0B5E56]/70">{website.replace(/^https?:\/\//, "")}</span>
          </span>
          <FiExternalLink className="size-4 shrink-0 text-[#0B5E56]/40" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

export function HeroEmailButton({ to, profileName, profileId }: { to: string; profileName: string; profileId?: string }) {
  const mail = to;
  return (
    <Dialog>
      <DialogTrigger
        aria-label="Email"
        title={mail}
        className="inline-flex size-11 items-center justify-center rounded-full border border-[#D9D2C2] bg-[#F6F3EE] text-[#0F1A2E] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20"
      >
        <FiMail className="size-[18px]" aria-hidden />
      </DialogTrigger>
      <DialogContent className="max-w-[460px] rounded-[20px] border-[#D9D2C2] bg-white p-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#F6F3EE] border border-[#D9D2C2] text-[#0F1A2E]">
          <FiMail className="size-6" />
        </div>
        <DialogHeader>
          <DialogTitle className="mt-3 text-center text-[18px] font-black text-[#0F1A2E]">Enviar email à empresa</DialogTitle>
          <DialogDescription className="text-center text-sm text-[#0F1A2E]/60">
            Escreva aqui e enviamos para <span className="font-semibold text-[#0F1A2E]">{mail}</span> via Workdeal.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-2.5">
          <span className="truncate font-mono text-xs font-bold text-[#0F1A2E]">{mail}</span>
          <CopyButton value={mail} />
        </div>
        <EmailForm to={mail} profileName={profileName} profileId={profileId} />
      </DialogContent>
    </Dialog>
  );
}
