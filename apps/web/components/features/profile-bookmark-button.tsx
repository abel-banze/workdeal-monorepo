"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBookmark, FiCheck, FiChevronDown, FiUser, FiBriefcase } from "react-icons/fi";
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
  const [saved, setSaved] = useState<SavedMap>({});
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Só lê estado inicial no cliente — a página pública mantém-se estática/cacheada
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sess = await authClient.getSession();
      if (cancelled) return;
      const isAuthed = !!sess?.data?.user;
      setAuthed(isAuthed);
      if (!isAuthed) return;
      try {
        const orgRes = await authClient.organization.list();
        const list = ((orgRes.data ?? []) as unknown as Org[]).map((o) => ({ id: o.id, name: o.name, slug: o.slug }));
        if (cancelled) return;
        setOrgs(list);
        const entries = await Promise.all([
          isProfileBookmarked(profileId).then((v) => ["personal", v] as const),
          ...list.map(async (o) => [o.id, await isProfileBookmarked(profileId, o.id)] as const),
        ]);
        if (!cancelled) setSaved(Object.fromEntries(entries));
      } catch {
        // silêncio — botão continua utilizável (toggle mostra erro se falhar)
      }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

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
    if (!res.ok) { setPickerOpen(false); return; }
    setSaved((prev) => ({ ...prev, [scope]: res.bookmarked }));
    if (res.bookmarked) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      trackEvent({ profileId, eventType: "save", metadata: { action: "profile_bookmark", profileName, scope } });
    }
  }, [busy, profileId, profileName]);

  const handleClick = useCallback(() => {
    if (authed === false) { router.push("/login"); return; }
    if (authed !== true || busy) return;
    // Sem empresas: comportamento directo (conta pessoal)
    if (orgs.length === 0) { void toggleScope("personal"); return; }
    setPickerOpen((v) => !v);
  }, [authed, busy, orgs.length, router, toggleScope]);

  const anyActive = Object.values(saved).some(Boolean) || savedFlash;
  const scopes = [{ id: "personal", name: "Conta pessoal", personal: true }, ...orgs.map((o) => ({ ...o, personal: false }))];

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || authed === null}
        aria-pressed={anyActive}
        aria-haspopup={orgs.length > 0 ? "menu" : undefined}
        aria-expanded={orgs.length > 0 ? pickerOpen : undefined}
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

      {pickerOpen && orgs.length > 0 && (
        <div
          role="menu"
          aria-label="Onde guardar"
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-[#D9D2C2] bg-white shadow-[0_12px_32px_rgba(15,26,46,0.14)]"
        >
          <p className="border-b border-[#D9D2C2]/70 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-[#0F1A2E]/50">
            GUARDAR EM
          </p>
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
