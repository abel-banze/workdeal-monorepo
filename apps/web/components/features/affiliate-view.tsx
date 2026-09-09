import { getAffiliateMeAction } from "@/app/actions/affiliates";
import { AffiliatePanel } from "@/components/features/affiliate-panel";
import type { AffiliateDashboard } from "@workdeal/shared";

const EMPTY: AffiliateDashboard = {
  affiliate: null,
  inviteLink: "",
  referrals: [],
  earnings: [],
  totals: { companiesInvited: 0, conversions: 0, pendingMzn: 0, paidMzn: 0 },
};

export async function AffiliateView() {
  let data: AffiliateDashboard = EMPTY;
  try {
    const res = await getAffiliateMeAction();
    if (res.ok) data = res.data;
  } catch {
    // API indisponível — mostra painel vazio
  }

  return <AffiliatePanel initial={data} />;
}