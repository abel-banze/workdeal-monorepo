import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getOrgRole } from "@workdeal/auth/repository";
import { AffiliateView } from "@/components/features/affiliate-view";

export default async function OrgAffiliatePage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  if (organizationId === "personal") redirect("/dashboard/personal");

  const session = await requireAuth();
  const role = await getOrgRole(session.user.id, organizationId);
  if (!role) notFound();

  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-5 pb-10">
      <AffiliateView />
    </div>
  );
}