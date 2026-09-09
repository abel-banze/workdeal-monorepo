"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBookmark, FiCheck, FiChevronDown, FiUser, FiBriefcase } from "react-icons/fi";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { isProfileBookmarked, toggleProfileBookmark } from "@/app/actions/bookmarks";
import { trackEvent } from "@/components/features/analytics";

type Props = {
  profileId: string;
  profileName: string;
};

type Org = { id: string; name: string; slug?: string | null };

// saved[scope] — "personal" ou organizationId
type SavedMap = Record<string, boolean>;

export function BookmarkButton({ profileId, profileName }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgsLoadError, setOrgsLoadError] = useState(false);
  const [saved, setSaved] = useState<SavedMap>({});
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Só lê estado inicial no cliente — a página pública mantém-se estática/cacheada
  const loadState = useCallback(async () => {
    let isAuthed = false;
    try {
      const sess = await authClient.getSession();
      isAuthed = !!sess?.data?.user;
      setAuthed(isAuthed);
      if (!isAuthed) return;
    } catch (err) {
      console.warn("[BookmarkButton] falha ao ler sessão:", err instanceof Error ? err.message : err);
      setAuthed(false);
      return;
    }
    try {
      setOrgsLoadError(false);
      const orgRes = await authClient.organization.list();
      if (orgRes.error) throw new Error(orgRes.error.message ?? "Falha ao listar empresas");
      const list = ((orgRes.data ?? []) as unknown as Org[]).map((o) => ({ id: o.id, name: o.name, slug: o.slug }));
      setOrgs(list);
      const entries = await Promise.all([
        isProfileBookmarked(profileId).then((v) => ["personal", v] as const),
        ...list.map(async (o) => [o.id, await isProfileBookmarked(profileId, o.id)] as const),
      ]);
      setSaved(Object.fromEntries(entries));
    } catch (err) {
      // Visível em vez de silencioso: sem empresas carregadas o botão grava
      // directo na conta pessoal sem mostrar o seletor — o utilizador precisa
      // saber porquê.
      console.warn("[BookmarkButton] falha ao carregar empresas:", err instanceof Error ? err.message : err);
      setOrgsLoadError(true);
      toast.error("Não consegui carregar as tuas empresas — toca para tentar de novo.");
    }
  }, [profileId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Fecha o seletor ao clicar fora / Escape
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPickerOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  const toggleScope = useCallback(async (scope: string) => {
    if (busy) return;
    setBusy(true);
    const res = await toggleProfileBookmark(profileId, scope === "personal" ? null : scope);
    setBusy(false);
    if (!res.ok) {
      setPickerOpen(false);
      toast.error(res.error ?? "Falha ao guardar perfil.");
      return;
    }
    setSaved((prev) => ({ ...prev, [scope]: res.bookmarked }));
    if (res.bookmarked) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      trackEvent({ profileId, eventType: "save", metadata: { action: "profile_bookmark", profileName, scope } });
    }
  }, [busy, profileId, profileName]);

  // Se a carga de empresas falhou, abre sempre o seletor (pessoal + retry)
  // em vez de gravar silenciosamente só na conta pessoal.
  const showPicker = orgs.length > 0 || orgsLoadError;

  const handleClick = useCallback(() => {
    if (authed === false) { router.push("/login"); return; }
    if (authed !== true || busy) return;
    // Sem empresas: comportamento directo (conta pessoal)
    if (!showPicker) { void toggleScope("personal"); return; }
    setPickerOpen((v) => !v);
  }, [authed, busy, showPicker, router, toggleScope]);

  const anyActive = Object.values(saved).some(Boolean) || savedFlash;
  const scopes = [{ id: "personal", name: "Conta pessoal", personal: true }, ...orgs.map((o) => ({ ...o, personal: false }))];

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || authed === null}
        aria-pressed={anyActive}
        aria-haspopup={showPicker ? "menu" : undefined}
        aria-expanded={showPicker ? pickerOpen : undefined}
        aria-label={anyActive ? "Guardado — gerir" : "Guardar perfil"}
        title={anyActive ? "Guardado — gerir" : "Guardar perfil"}
        className={`inline-flex size-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20 disabled:opacity-60 ${
          anyActive
            ? "border-[#FF3B1F]/20 bg-[#FF3B1F] text-white hover:bg-[#E02E16]"
            : "border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE]"
        }`}
      >
        {savedFlash ? <FiCheck className="size-[18px]" aria-hidden /> : <FiBookmark className="size-[18px]" fill={anyActive ? "currentColor" : "none"} aria-hidden />}
      </button>

      {pickerOpen && showPicker && (
        <div
          role="menu"
          aria-label="Onde guardar"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.14)]"
        >
          <p className="border-b border-[#D9D2C2]/70 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-[#0F1A2E]/50">
            GUARDAR EM
          </p>
          {orgsLoadError && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadState()}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[12px] font-bold text-[#FF3B1F] transition hover:bg-[#FF3B1F]/5 disabled:opacity-50"
            >
              <FiChevronDown className="size-3.5 rotate-90" aria-hidden />
              Falha ao carregar empresas — tocar para tentar de novo
            </button>
          )}
          {scopes.map((s) => {
            const on = !!saved[s.id];
            return (
              <button
                key={s.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={on}
                disabled={busy}
                onClick={() => void toggleScope(s.id)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-[#F6F3EE] disabled:opacity-50"
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${s.personal ? "bg-[#0F1A2E]/5 text-[#0F1A2E]" : "bg-[#0B5E56]/10 text-[#0B5E56]"}`}>
                  {s.personal ? <FiUser className="size-3.5" aria-hidden /> : <FiBriefcase className="size-3.5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-[#0F1A2E]">{s.name}</span>
                  <span className="block text-[11px] text-[#0F1A2E]/50">{s.personal ? "Só tu vês" : "Partilhado com a empresa"}</span>
                </span>
                {on ? (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#0B5E56] text-white">
                    <FiCheck className="size-3" aria-hidden />
                  </span>
                ) : (
                  <FiChevronDown className="size-3.5 -rotate-90 text-[#0F1A2E]/25" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
