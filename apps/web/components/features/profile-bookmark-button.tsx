"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiBookmark, FiCheck } from "react-icons/fi";
import { authClient } from "@/lib/auth-client";
import { isProfileBookmarked, toggleProfileBookmark } from "@/app/actions/bookmarks";
import { trackEvent } from "@/components/features/analytics";

type Props = {
  profileId: string;
  profileName: string;
};

export function BookmarkButton({ profileId, profileName }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Só lê estado inicial no cliente — a página pública mantém-se estática/cacheada
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sess = await authClient.getSession();
      if (cancelled) return;
      const isAuthed = !!sess?.data?.user;
      setAuthed(isAuthed);
      if (isAuthed && (await isProfileBookmarked(profileId)) && !cancelled) {
        setBookmarked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const handleToggle = useCallback(async () => {
    if (authed === false) { router.push("/login"); return; }
    if (authed !== true || busy) return;
    setBusy(true);
    const res = await toggleProfileBookmark(profileId);
    setBusy(false);
    if (!res.ok) return;
    setBookmarked(res.bookmarked);
    if (res.bookmarked) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      trackEvent({ profileId, eventType: "save", metadata: { action: "profile_bookmark", profileName } });
    }
  }, [authed, busy, profileId, profileName, router]);

  const active = bookmarked || savedFlash;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy || authed === null}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remover dos guardados" : "Guardar perfil"}
      title={bookmarked ? "Remover dos guardados" : "Guardar perfil"}
      className={`inline-flex size-11 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5E56]/20 disabled:opacity-60 ${
        active
          ? "border-[#FF3B1F]/20 bg-[#FF3B1F] text-white hover:bg-[#E02E16]"
          : "border-[#D9D2C2] bg-white text-[#0F1A2E] hover:bg-[#F6F3EE]"
      }`}
    >
      {savedFlash ? <FiCheck className="size-[18px]" aria-hidden /> : <FiBookmark className="size-[18px]" fill={active ? "currentColor" : "none"} aria-hidden />}
    </button>
  );
}