"use client";

import { useRef, useState } from "react";
import { FiFileText, FiUpload, FiX, FiCheck } from "react-icons/fi";
import { VERIFICATION_DOCUMENT_TYPES, type VerificationDocumentInput } from "@workdeal/shared";
import { uploadFilesAction } from "@/app/actions/files";

type UploadedDoc = VerificationDocumentInput;

type Props = {
  value: UploadedDoc[];
  onChange: (docs: UploadedDoc[]) => void;
  disabled?: boolean;
};

const uploadCls =
  "inline-flex items-center gap-1.5 rounded-full border border-[#0B5E56]/25 bg-white px-3 py-1.5 text-xs font-bold text-[#0B5E56] transition hover:bg-[#0B5E56]/5 disabled:opacity-50";

export function VerificationDocuments({ value, onChange, disabled }: Props) {
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function docFor(type: string): UploadedDoc | undefined {
    return value.find((d) => d.type === type);
  }

  async function handleFile(type: string, file: File) {
    setUploadingType(type);
    setError(null);
    try {
      const res = await uploadFilesAction((() => {
        const fd = new FormData();
        fd.set("file", file, file.name);
        fd.set("purpose", "verification");
        return fd;
      })());
      if (!res.ok || !res.file) {
        setError(res.error ?? "Falha ao carregar o documento.");
        return;
      }
      const next = value.filter((d) => d.type !== type).concat({
        type,
        fileId: res.file.id,
        url: res.file.url,
        name: res.file.originalFilename ?? file.name,
      });
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar o documento.");
    } finally {
      setUploadingType(null);
      if (inputRefs.current[type]) inputRefs.current[type].value = "";
    }
  }

  function removeDoc(type: string) {
    onChange(value.filter((d) => d.type !== type));
  }

  return (
    <div className="space-y-2.5">
      <p className="font-mono text-[11px] leading-relaxed text-[#0F1A2E]/50">
        Anexa os documentos (PDF ou imagem · máx 10MB). Obrigatórios no 1º grau.
      </p>
      <ul className="space-y-2">
        {VERIFICATION_DOCUMENT_TYPES.map((docType) => {
          const doc = docFor(docType.id);
          const uploading = uploadingType === docType.id;
          return (
            <li key={docType.id} className={`rounded-2xl border p-3.5 transition ${doc ? "border-[#0B5E56]/30 bg-[#0B5E56]/[0.04]" : "border-[#D9D2C2] bg-[#F6F3EE]/70"}`}>
              <div className="flex items-center gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${doc ? "bg-[#0B5E56] text-white" : "bg-[#0F1A2E]/10 text-[#0F1A2E]/40"}`}>
                  {doc ? <FiCheck className="size-4" /> : <FiFileText className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold leading-tight ${doc ? "text-[#0F1A2E]" : "text-[#0F1A2E]/70"}`}>
                    {docType.label}{" "}
                    {docType.required ? <span className="font-mono text-[11px] text-[#FF3B1F]">*</span> : <span className="font-mono text-[11px] font-medium text-[#0F1A2E]/35">opcional</span>}
                  </p>
                  {doc ? (
                    <p className="truncate text-xs text-[#0F1A2E]/55">
                      {doc.name || "Documento anexado"}{" "}
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#0B5E56] underline underline-offset-2 hover:text-[#0A4A44]">
                        ver
                      </a>
                    </p>
                  ) : (
                    <p className="text-xs text-[#0F1A2E]/40">Nenhum ficheiro anexado</p>
                  )}
                </div>
                <div className="shrink-0">
                  {doc ? (
                    <button
                      type="button"
                      onClick={() => removeDoc(docType.id)}
                      disabled={disabled}
                      aria-label={`Remover ${docType.label}`}
                      className="flex size-8 items-center justify-center rounded-full bg-white text-[#0F1A2E]/55 ring-1 ring-[#D9D2C2] transition hover:bg-[#FF3B1F]/10 hover:text-[#7A1A0A] disabled:opacity-50"
                    >
                      <FiX className="size-4" />
                    </button>
                  ) : (
                    <>
                      <input
                        ref={(el) => { inputRefs.current[docType.id] = el; }}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        className="hidden"
                        disabled={disabled || uploading}
                        onChange={(e) => e.target.files?.[0] && handleFile(docType.id, e.target.files[0])}
                      />
                      <button
                        type="button"
                        onClick={() => inputRefs.current[docType.id]?.click()}
                        disabled={disabled || uploading}
                        className={uploadCls}
                      >
                        {uploading ? <FiUpload className="size-3 animate-pulse" /> : <FiUpload className="size-3" />}
                        {uploading ? "A carregar…" : "Anexar"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="rounded-xl border border-[#FF3B1F]/20 bg-[#FF3B1F]/10 px-3 py-2 text-xs font-medium text-[#7A1A0A]">{error}</p>
      ) : null}
    </div>
  );
}