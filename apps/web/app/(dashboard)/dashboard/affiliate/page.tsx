import { requireAuth } from "@/lib/auth";
import { AffiliateView } from "@/components/features/affiliate-view";

export default async function PersonalAffiliatePage() {
  await requireAuth();

  return (
    <div className="mx-auto w-full max-w-[1160px] space-y-5 pb-10">
      <AffiliateView />
    </div>
  );
}