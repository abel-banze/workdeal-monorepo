"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/components/features/analytics";

export function SearchImpressions({ profileIds }: { profileIds: string[] }) {
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    if (!profileIds.length) return;

    // Track all visible profiles as search impressions (debounced, max once per profile)
    const timer = setTimeout(() => {
      for (const id of profileIds) {
        if (!tracked.current.has(id)) {
          tracked.current.add(id);
          trackEvent({ profileId: id, eventType: "search_impression" });
        }
      }
    }, 1000); // wait 1s to ensure the user actually sees the results

    return () => clearTimeout(timer);
  }, [profileIds]);

  return null;
}
