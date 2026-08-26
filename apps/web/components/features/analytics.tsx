"use client";

import { useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

function getVisitorId(): string {
  if (typeof document === "undefined") return "";
  const cookie = document.cookie.split("; ").find((c) => c.startsWith("wd_vid="));
  if (cookie) return cookie.split("=")[1]!;
  const id = crypto.randomUUID();
  document.cookie = `wd_vid=${id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  return id;
}

export async function trackEvent(data: {
  profileId: string;
  eventType: string;
  province?: string;
  district?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const visitorId = getVisitorId();
    await fetch("/api/v1/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, visitorId }),
      keepalive: true,
    });
  } catch {}
}

export function Analytics({ profileId, province, district }: { profileId: string; province?: string; district?: string }) {
  const pathname = usePathname();

  const trackPageView = useCallback(() => {
    trackEvent({
      profileId,
      eventType: "page_view",
      province,
      district,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
    });
  }, [profileId, province, district]);

  useEffect(() => {
    trackPageView();
  }, [trackPageView]);

  // Also track on visibility change (user returns to tab)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        trackPageView();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [trackPageView]);

  return null;
}

export function useTrackClick(profileId: string, eventType: string, metadata?: Record<string, unknown>) {
  return useCallback(() => {
    trackEvent({ profileId, eventType, metadata });
  }, [profileId, eventType, metadata]);
}
