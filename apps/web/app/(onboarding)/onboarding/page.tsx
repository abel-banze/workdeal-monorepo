import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getCategories } from "@/lib/profiles";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  let hasProfile = false;
  try {
    const { apiFetch } = await import("@/lib/api");
    const res = await apiFetch<{ id: string } | null>("/api/v1/profiles/me", { cache: "no-store" });
    hasProfile = !!res.data;
  } catch {
    hasProfile = false;
  }
  if (hasProfile) redirect("/dashboard?welcome=1");

  let categories: { id: string; name: string; slug: string }[] = [];
  try {
    const res = await getCategories();
    categories = (res as { data: typeof categories }).data ?? [];
  } catch {
    categories = [];
  }

  // Tags activas para o passo de interesses (chips em vez de free-text,
  // evita slugs desconhecidos serem descartados pelo backend)
  let tags: { slug: string; name: string }[] = [];
  try {
    const { apiFetch } = await import("@/lib/api");
    const res = await apiFetch<{ slug: string; name: string }[]>("/api/v1/tags", {
      next: { revalidate: 3600 },
    });
    tags = (res.data ?? []).map((t) => ({ slug: t.slug, name: t.name }));
  } catch {
    tags = [];
  }

  // SSR-first: fetch inicial de organizações no servidor, nunca via useEffect no cliente
  let initialOrganizationId: string | null = null;
  let initialOrganizationName: string | null = null;
  try {
    const { listUserOrganizations } = await import("@workdeal/auth/repository");
    const orgs = await listUserOrganizations(session.user.id);
    if (orgs.length > 0 && orgs[0]?.id) {
      initialOrganizationId = orgs[0].id;
      initialOrganizationName = orgs[0].name ?? null;
    }
  } catch {
    initialOrganizationId = null;
    initialOrganizationName = null;
  }

  return (
    <OnboardingForm
      categories={categories}
      tags={tags}
      userName={session.user.name}
      userEmail={session.user.email}
      initialOrganizationId={initialOrganizationId}
      initialOrganizationName={initialOrganizationName}
    />
  );
}
