import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { getCategories } from "@/lib/profiles";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
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

  // SSR-first: fetch inicial de organizações no servidor, nunca via useEffect no cliente.
  // Quando o claim pre-register redireciona para /onboarding?orgId=..., usamos esse id
  // para seleccionar a organização certa e pré-preencher com a metadata capturada.
  const requestedOrgId = (() => {
    const raw = searchParams?.orgId;
    if (!raw) return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v && v.trim() ? v.trim() : null;
  })();

  let initialOrganizationId: string | null = null;
  let initialOrganizationName: string | null = null;
  let initialMetadata: {
    categorySlugs?: string[];
    formattedAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    googlePlaceId?: string | null;
    province?: string | null;
    city?: string | null;
    logoUrl?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
  } | undefined;

  try {
    const { listUserOrganizations, getOrganizationOnboardingData } = await import("@workdeal/auth/repository");
    const orgs = await listUserOrganizations(session.user.id);

    const chosenId =
      (requestedOrgId && orgs.some((o) => o.id === requestedOrgId) ? requestedOrgId : null) ??
      (orgs.length > 0 ? orgs[0]?.id ?? null : null);

    if (chosenId) {
      initialOrganizationId = chosenId;
      initialOrganizationName = orgs.find((o) => o.id === chosenId)?.name ?? null;

      const orgData = await getOrganizationOnboardingData(chosenId);
      if (orgData?.metadata) {
        initialMetadata = {
          categorySlugs: Array.isArray(orgData.metadata.categorySlugs)
            ? (orgData.metadata.categorySlugs as string[])
            : undefined,
          formattedAddress: typeof orgData.metadata.formattedAddress === "string" ? orgData.metadata.formattedAddress : null,
          latitude: typeof orgData.metadata.latitude === "number" ? orgData.metadata.latitude : null,
          longitude: typeof orgData.metadata.longitude === "number" ? orgData.metadata.longitude : null,
          googlePlaceId: typeof orgData.metadata.googlePlaceId === "string" ? orgData.metadata.googlePlaceId : null,
          province: typeof orgData.metadata.province === "string" ? orgData.metadata.province : null,
          city: typeof orgData.metadata.city === "string" ? orgData.metadata.city : null,
          logoUrl: typeof orgData.metadata.logoUrl === "string" ? orgData.metadata.logoUrl : null,
          contactPhone: orgData.contactPhone ?? null,
          contactEmail: orgData.contactEmail ?? null,
        };
      }
    }
  } catch {
    initialOrganizationId = null;
    initialOrganizationName = null;
    initialMetadata = undefined;
  }

  return (
    <OnboardingForm
      categories={categories}
      tags={tags}
      userName={session.user.name}
      userEmail={session.user.email}
      initialOrganizationId={initialOrganizationId}
      initialOrganizationName={initialOrganizationName}
      initialMetadata={initialMetadata}
    />
  );
}
