"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { FiMail, FiPhone, FiUser, FiMessageSquare, FiBriefcase, FiPaperclip, FiX, FiUploadCloud, FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@workspace/ui/components/select";
import { authClient } from "@/lib/auth-client";

type OrgOption = { id: string; name: string; slug: string };

const STEPS = ["Pedido", "Contactos", "Revisão"] as const;

type Props = {
  trigger: React.ReactElement;
  serviceLabel: string;
  serviceTag?: string;
  portfolioItemId?: string | null;
  targetProfileId: string;
  profileName: string;
  profileEmail?: string | null;
};

export function QuoteDialog({ trigger, serviceLabel, serviceTag, portfolioItemId, targetProfileId, profileName }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [requesterOrgId, setRequesterOrgId] = useState<string>("personal");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [session, setSession] = useState<{ user: { name: string; email: string; phone?: string | null } } | null>(null);
  const [attachments, setAttachments] = useState<{ id: string; url: string; name: string; bytes?: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Puxa dados do user logado quando abre — pré-preenche se existir sessão;
  // sem sessão o diálogo continua utilizável (cotação como convidado)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setUserLoading(true);
      try {
        const sess = await authClient.getSession();
        const u = sess.data?.user;
        if (!cancelled && u) {
          setSession({ user: { name: u.name ?? "", email: u.email ?? "", phone: (u as { phone?: string }).phone ?? null } });
          setFromName((v) => v || u.name || "");
          setFromEmail((v) => v || u.email || "");
          setPhone((v) => v || (u as { phone?: string }).phone || "");
        }
        const orgRes = await authClient.organization.list();
        if (!cancelled && orgRes.data) {
          const list = (orgRes.data as unknown as OrgOption[]).map((o) => ({ id: o.id, name: o.name, slug: o.slug }));
          setOrgs(list);
        }
      } catch {
        // silêncio — diálogo continua utilizável sem pré-preenchimento
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  function handleOrgChange(nextId: string) {
    setRequesterOrgId(nextId);
    if (nextId === "personal") {
      if (session?.user.name) setFromName(session.user.name);
      if (session?.user.email) setFromEmail(session.user.email);
    } else {
      const org = orgs.find((o) => o.id === nextId);
      if (org) {
        setFromName(org.name);
        // email mantém o do utilizador logado, mas sincroniza se ainda vazio
        if (session?.user.email) setFromEmail(session.user.email);
      }
    }
  }

  function validateStep(s: number): string | null {
    if (s === 0 && message.trim().length < 10) return "Mensagem deve ter ≥10 caracteres.";
    if (s === 1) {
      if (fromName.trim().length < 2) return "Indique o seu nome.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) return "Email inválido.";
    }
    return null;
  }

  function goNext() {
    const v = validateStep(step);
    if (v) { setErr(v); return; }
    setErr(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setErr(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const maxFiles = 5;
    const maxBytes = 10 * 1024 * 1024;
    const remaining = maxFiles - attachments.length;
    if (remaining <= 0) { setErr(`Máximo de ${maxFiles} ficheiros.`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    const oversized = toUpload.find((f) => f.size > maxBytes);
    if (oversized) { setErr(`"${oversized.name}" excede 10MB.`); return; }
    setUploading(true);
    setErr(null);
    try {
      const { uploadFilesAction } = await import("@/app/actions/files");
      for (const f of toUpload) {
        const fd = new FormData();
        fd.set("file", f);
        fd.set("purpose", "quote");
        const res = await uploadFilesAction(fd);
        if (!res.ok || !res.file) { setErr(res.error ?? "Falha ao carregar ficheiro."); break; }
        setAttachments((prev) => [...prev, { id: res.file!.id, url: res.file!.url, name: res.file!.originalFilename ?? f.name, bytes: res.file!.bytes ?? f.size }]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao carregar ficheiros.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!targetProfileId) { setErr("Perfil destino em falta."); return; }
    if (uploading) { setErr("Aguarde o carregamento dos ficheiros."); return; }
    setStatus("sending");
    try {
      const { createQuoteAction } = await import("@/app/actions/quotes");
      const res = await createQuoteAction({
        targetProfileId,
        requesterOrganizationId: requesterOrgId === "personal" ? null : requesterOrgId,
        serviceLabel,
        serviceTag: serviceTag ?? null,
        portfolioItemId: portfolioItemId ?? null,
        message: message.trim(),
        contactName: fromName.trim(),
        contactEmail: fromEmail.trim(),
        contactPhone: phone.trim() || null,
        fileIds: attachments.map((a) => a.id),
      });
      if (!res.ok) { setStatus("error"); setErr(res.error ?? "Falha ao enviar."); return; }
      setStatus("ok");
    } catch (e2) {
      setStatus("error");
      setErr(e2 instanceof Error ? e2.message : "Falha ao enviar.");
    }
  }

  const selectedLabel = (() => {
    if (requesterOrgId === "personal") return `Perfil pessoal — ${session?.user.name ?? (fromName || "você")}`;
    const found = orgs.find((o) => o.id === requesterOrgId);
    if (found) return `${found.name} · ${found.slug}`;
    if (userLoading) return "A carregar...";
    if (orgs.length === 0) return "Perfil pessoal";
    return "Escolha o perfil solicitante";
  })();

  const inputCls = "w-full rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] py-2.5 pl-9 pr-3 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 outline-none";
  const labelCls = "text-[11px] font-bold uppercase tracking-[0.08em] text-[#0F1A2E]/60";

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setStatus("idle"); setErr(null); setStep(0); setAttachments([]); setUploading(false); } }}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-[1200px] rounded-[22px] border-[#D9D2C2] bg-white p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#0F1A2E] text-white">
              <FiMessageSquare className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[17px] font-black leading-none tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                Pedir cotação
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
                {serviceLabel} · <span className="font-semibold text-[#0F1A2E]">{profileName}</span>
                {serviceTag ? <span className="rounded-full bg-[#F6F3EE] px-2 py-0.5 font-mono text-[11px] tracking-[0.08em] ring-1 ring-[#D9D2C2] ml-1.5">{serviceTag}</span> : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {status === "ok" ? (
          <div className="mt-5 rounded-2xl border border-[#0B5E56]/20 bg-[#0B5E56]/10 px-4 py-6 text-center">
            <p className="text-sm font-bold text-[#0B5E56]">Pedido registado ✓</p>
            <p className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/60">
              A empresa foi notificada por WhatsApp e responde em até 24h.
            </p>
            {session ? (
              <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/40">Pode acompanhar em Dashboard → Cotações</p>
            ) : (
              <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/40">A resposta será enviada para {fromEmail}</p>
            )}
            <Button variant="outline" size="sm" className="mt-4 rounded-full border-[#0B5E56]/20 bg-white" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Stepper */}
            <div className="flex items-center gap-2">
              {STEPS.map((label, i) => (
                <Fragment key={label}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        i < step
                          ? "bg-[#0B5E56] text-white"
                          : i === step
                            ? "bg-[#0F1A2E] text-white"
                            : "bg-[#F6F3EE] text-[#0F1A2E]/40 ring-1 ring-[#D9D2C2]"
                      }`}
                    >
                      {i < step ? <FiCheck className="size-3" /> : i + 1}
                    </span>
                    <span className={`hidden text-[11px] font-bold uppercase tracking-[0.06em] sm:inline ${i === step ? "text-[#0F1A2E]" : "text-[#0F1A2E]/40"}`}>
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? <span className={`h-px flex-1 ${i < step ? "bg-[#0B5E56]" : "bg-[#D9D2C2]"}`} /> : null}
                </Fragment>
              ))}
            </div>

            {/* Passo 1 — Pedido */}
            {step === 0 ? (
              <div>
                <label className={`flex items-center gap-1.5 ${labelCls}`}>
                  <FiMessageSquare className="size-3.5" /> O que precisa? *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Olá ${profileName}, preciso de cotação para ${serviceLabel}. Detalhes: local, prazo, quantidades...`}
                  rows={6}
                  autoFocus
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-3 py-2.5 text-sm text-[#0F1A2E] placeholder:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white focus:ring-2 focus:ring-[#0B5E56]/15 outline-none"
                />
                <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/40">Mínimo 10 caracteres. Quanto mais detalhe, melhor a cotação.</p>
              </div>
            ) : null}

            {/* Passo 2 — Contactos */}
            {step === 1 ? (
              <div className="space-y-3">
                {!session && !userLoading ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E8B86A]/40 bg-[#FFF8E7] px-3 py-2">
                    <p className="text-xs leading-relaxed text-[#0F1A2E]/70">
                      Tem conta? Entre para pré-preencher os dados e acompanhar a resposta no dashboard.
                    </p>
                    <a href="/login" className="shrink-0 rounded-full bg-[#0F1A2E] px-3 py-1.5 text-xs font-bold text-white hover:bg-black">Entrar</a>
                  </div>
                ) : null}

                {session ? (
                  <div>
                    <label className={`flex items-center gap-1.5 ${labelCls}`}>
                      <FiBriefcase className="size-3.5" /> Pedir como *
                    </label>
                    <Select value={requesterOrgId} onValueChange={(v) => handleOrgChange(v ?? "personal")}>
                      <SelectTrigger className="mt-1.5 h-11 w-full rounded-xl border-[#D9D2C2] bg-[#F6F3EE] text-sm data-[placeholder]:text-[#0F1A2E]/35 focus:border-[#0B5E56] focus:bg-white">
                        <span className="truncate text-sm text-[#0F1A2E]">{selectedLabel}</span>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#D9D2C2]">
                        <SelectItem value="personal">Perfil pessoal — {session?.user.name ?? (fromName || "você")}</SelectItem>
                        {orgs.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.name} · {o.slug}</SelectItem>
                        ))}
                        {orgs.length === 0 && !userLoading ? <div className="px-3 py-2 text-xs text-[#0F1A2E]/40">Nenhuma empresa — use perfil pessoal</div> : null}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 font-mono text-[11px] text-[#0F1A2E]/40">A empresa verá este perfil na cotação.</p>
                  </div>
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Seu nome *</label>
                    <div className="relative mt-1.5">
                      <FiUser className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#0F1A2E]/30" />
                      <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Ex: João Silva" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Seu email *</label>
                    <div className="relative mt-1.5">
                      <FiMail className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#0F1A2E]/30" />
                      <input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="voce@empresa.co.mz" className={inputCls} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Telefone / WhatsApp</label>
                  <div className="relative mt-1.5">
                    <FiPhone className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#0F1A2E]/30" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258 82 000 0000 (opcional)" className={inputCls} />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Passo 3 — Anexos & revisão */}
            {step === 2 ? (
              <div className="space-y-3">
                <div>
                  <label className={`flex items-center gap-1.5 ${labelCls}`}>
                    <FiPaperclip className="size-3.5" /> Anexos <span className="font-normal normal-case tracking-normal text-[#0F1A2E]/40">(opcional · máx 5 · 10MB cada)</span>
                  </label>
                  <div className="mt-1.5">
                    <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFilesSelected(e.target.files)} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || attachments.length >= 5}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3 text-sm font-medium text-[#0F1A2E]/70 transition hover:border-[#0B5E56]/40 hover:bg-white hover:text-[#0F1A2E] disabled:opacity-50"
                    >
                      <FiUploadCloud className="size-4" />
                      {uploading ? "A carregar..." : attachments.length >= 5 ? "Limite atingido" : "Adicionar ficheiros"}
                    </button>
                    {attachments.length > 0 ? (
                      <ul className="mt-2 space-y-1.5">
                        {attachments.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#D9D2C2] bg-white px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-[#0F1A2E]">{a.name}</p>
                              <p className="font-mono text-[11px] text-[#0F1A2E]/40">{a.bytes ? `${(a.bytes / 1024).toFixed(1)} KB` : ""} · <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#0B5E56]">ver</a></p>
                            </div>
                            <button type="button" onClick={() => removeAttachment(a.id)} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#F6F3EE] text-[#0F1A2E]/60 hover:bg-[#FF3B1F]/10 hover:text-[#7A1A0A]">
                              <FiX className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {/* Resumo */}
                <div className="rounded-xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#0F1A2E]/40">Resumo</p>
                  <dl className="mt-2 space-y-1 text-xs">
                    <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#0F1A2E]/50">Serviço</dt><dd className="truncate text-right font-semibold text-[#0F1A2E]">{serviceLabel}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#0F1A2E]/50">Para</dt><dd className="truncate text-right font-semibold text-[#0F1A2E]">{profileName}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#0F1A2E]/50">Contacto</dt><dd className="truncate text-right font-semibold text-[#0F1A2E]">{fromName} · {fromEmail}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="shrink-0 text-[#0F1A2E]/50">Anexos</dt><dd className="text-right font-semibold text-[#0F1A2E]">{attachments.length}</dd></div>
                  </dl>
                </div>
              </div>
            ) : null}

            {err ? <p className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{err}</p> : null}

            <div className="flex gap-2">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={goBack} className="h-11 rounded-full border-[#D9D2C2] bg-white px-5 text-sm font-bold text-[#0F1A2E]">
                  <FiArrowLeft className="size-4" /> Voltar
                </Button>
              ) : null}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext} className="h-11 flex-1 rounded-full bg-[#0F1A2E] px-5 text-sm font-bold text-white hover:bg-black">
                  Continuar <FiArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={status === "sending" || uploading} className="h-11 flex-1 rounded-full bg-[#0B5E56] px-5 text-sm font-bold text-white hover:bg-[#0A4A44] disabled:opacity-50">
                  {status === "sending" ? "A registar..." : uploading ? "A carregar ficheiros..." : "Enviar pedido"}
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
