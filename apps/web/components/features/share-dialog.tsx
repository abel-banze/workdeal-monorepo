"use client";

import { useState } from "react";
import { FiShare2, FiLink, FiMail, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { FaFacebookF, FaLinkedinIn, FaXTwitter, FaInstagram } from "react-icons/fa6";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@workspace/ui/components/dialog";

export type ShareDialogProps = {
  trigger: React.ReactElement;
  /** Título do dialog, ex. "Partilhar pedido". */
  dialogTitle: string;
  /** Nome do item, mostrado na descrição ("Envia X para alguém"). */
  itemName: string;
  /** Caminho público do item, ex. `/tasks/abc`. Resolvido contra a origem actual. */
  path: string;
  /** Texto de partilha (WhatsApp/email/redes), ex. "Título · Requisição no Workdeal". */
  shareText: string;
  /** Assunto do email, ex. "Título no Workdeal". */
  mailSubject: string;
  /** Nota de rodapé do dialog. */
  footerNote?: string;
};

/** Dialog genérico de partilha: WhatsApp, email, copiar link e redes sociais. */
export function ShareDialog({ trigger, dialogTitle, itemName, path, shareText, mailSubject, footerNote }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(() => new URL(path, "https://workdeal.co.mz").href);

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setCopied(false);
      setCurrentUrl(new URL(path, window.location.origin).href);
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(`${shareText}\n${currentUrl}`)}`;
  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedText = encodeURIComponent(shareText);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const instagramUrl = `https://www.instagram.com/?url=${encodedUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard indisponível — falha silenciosa
    }
  }

  const optionCls =
    "flex items-center gap-3 rounded-2xl border border-[#D9D2C2] bg-[#F6F3EE] px-4 py-3.5 text-left text-sm font-bold text-[#0F1A2E] transition hover:bg-white hover:border-[#0B5E56]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-[420px] rounded-[22px] border-[#D9D2C2] bg-white p-6">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-[#0F1A2E] text-white">
              <FiShare2 className="size-5" />
            </span>
            <div>
              <DialogTitle className="text-[17px] font-black leading-none tracking-[-0.02em] text-[#0F1A2E]" style={{ fontFamily: "var(--font-display)" }}>
                {dialogTitle}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed text-[#0F1A2E]/55">
                Envia <span className="font-semibold text-[#0F1A2E]">{itemName}</span> para alguém
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-5 space-y-2.5">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={optionCls}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0B5E56] text-white">
              <FaWhatsapp className="size-[18px]" />
            </span>
            <span>
              WhatsApp
              <span className="block text-xs font-medium text-[#0F1A2E]/50">Enviar mensagem com o link</span>
            </span>
          </a>

          <a href={mailtoUrl} className={optionCls}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0F1A2E] text-white">
              <FiMail className="size-[18px]" />
            </span>
            <span>
              Email
              <span className="block text-xs font-medium text-[#0F1A2E]/50">Recomendar por email</span>
            </span>
          </a>

          <button type="button" onClick={copyLink} className={optionCls}>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${copied ? "bg-[#0B5E56]" : "bg-[#0F1A2E]/70"}`}>
              {copied ? <FiCheck className="size-[18px]" /> : <FiLink className="size-[18px]" />}
            </span>
            <span>
              {copied ? "Link copiado!" : "Copiar link"}
              <span className="block truncate max-w-[220px] text-xs font-medium text-[#0F1A2E]/50">{currentUrl || "…"}</span>
            </span>
          </button>
        </div>

        <p className="mt-4 mb-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#0F1A2E]/35">Partilhar nas redes sociais</p>
        <div className="grid grid-cols-4 gap-2">
          <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:scale-105">
              <FaFacebookF className="size-[18px]" />
            </span>
            <span className="text-[10px] font-bold text-[#0F1A2E]/55">Facebook</span>
          </a>
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#0A66C2] text-white transition hover:scale-105">
              <FaLinkedinIn className="size-[18px]" />
            </span>
            <span className="text-[10px] font-bold text-[#0F1A2E]/55">LinkedIn</span>
          </a>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#0F1A2E] text-white transition hover:scale-105">
              <FaXTwitter className="size-[18px]" />
            </span>
            <span className="text-[10px] font-bold text-[#0F1A2E]/55">X</span>
          </a>
          <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#E1306C] text-white transition hover:scale-105">
              <FaInstagram className="size-[18px]" />
            </span>
            <span className="text-[10px] font-bold text-[#0F1A2E]/55">Instagram</span>
          </a>
        </div>

        {footerNote ? <p className="mt-5 text-center font-mono text-[11px] text-[#0F1A2E]/40">{footerNote}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
