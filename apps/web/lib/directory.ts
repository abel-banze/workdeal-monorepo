import type { EventView, TaskView } from "@workdeal/shared";
import { apiFetch } from "@/lib/api";

export { PROVINCES } from "@workdeal/shared";

export type PublicEventView = EventView & { myRegistration?: string | null };

function buildQs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function getPublicEvents(params: Record<string, string | undefined> = {}) {
  return apiFetch<PublicEventView[]>(`/api/v1/events${buildQs(params)}`, {
    next: { revalidate: 300, tags: ["events"] },
  });
}

export async function getEventBySlug(slug: string) {
  return apiFetch<PublicEventView>(`/api/v1/events/by-slug/${encodeURIComponent(slug)}`, {
    next: { revalidate: 300, tags: [`events:${slug}`] },
  });
}

export async function getPublicTasks(params: Record<string, string | undefined> = {}) {
  return apiFetch<TaskView[]>(`/api/v1/tasks${buildQs(params)}`, { cache: "no-store" });
}

export async function getPublicTask(id: string) {
  return apiFetch<TaskView>(`/api/v1/tasks/${encodeURIComponent(id)}`, { cache: "no-store" });
}