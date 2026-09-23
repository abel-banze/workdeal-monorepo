import { listBroadcastCampaigns, type BroadcastCampaignItem } from "@/app/actions/broadcast";
import { requireSystemRole } from "@/lib/auth";
import { CampaignsManager } from "./campaigns-manager";
import { IndividualComposer } from "./individual-composer";

export const metadata = {
  title: "Newsletter | Workdeal Admin",
};

export default async function BroadcastPage() {
  await requireSystemRole("moderator", "admin");

  const campaigns = await listBroadcastCampaigns()
    .then((res) => ((res.data ?? []) as BroadcastCampaignItem[]))
    .catch(() => [] as BroadcastCampaignItem[]);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B5E56]">
          Comunicação · Difusão em massa
        </p>
        <h1
          className="mt-2 text-2xl font-black leading-tight tracking-[-0.04em] text-[#0F1A2E] sm:text-[26px]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Newsletter
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#0F1A2E]/50">
          Campanhas WhatsApp/email/SMS para todas as empresas num clique (envio em lotes resumíveis), ou mensagens individuais em qualquer canal.
        </p>
      </div>

      <CampaignsManager initial={campaigns} />
      <IndividualComposer />
    </div>
  );
}
