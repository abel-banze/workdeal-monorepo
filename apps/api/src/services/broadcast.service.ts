import type { AuthUser, BroadcastChannel, CreateBroadcastCampaignInput, SendIndividualMessageInput } from "@workdeal/shared";
import { BROADCAST_WHATSAPP_TEMPLATES } from "@workdeal/shared";
import { normalizeMzPhone } from "@workdeal/shared/lib/phone";
import { AppError } from "../lib/errors.js";
import { broadcastRepository } from "../repositories/broadcast.repository.js";
import { sendEmail, sendSms, sendWhatsappTemplate } from "../lib/channels.js";

const BATCH_DELAY_MS = 800;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Substitui {{company}} / {{name}} no conteúdo de email/SMS. */
function renderVars(template: string, companyName: string | null): string {
  const name = companyName ?? "a sua empresa";
  return template.replace(/\{\{\s*company\s*\}\}/gi, name).replace(/\{\{\s*name\s*\}\}/gi, name);
}

function resolvePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return normalizeMzPhone(raw);
}

export const broadcastService = {
  async createCampaign(staff: AuthUser, input: CreateBroadcastCampaignInput) {
    if (input.channel === "whatsapp" && !(BROADCAST_WHATSAPP_TEMPLATES as readonly string[]).includes(input.templateKey ?? "")) {
      throw new AppError(400, "UNKNOWN_TEMPLATE", `Template WhatsApp desconhecido. Usa um de: ${(BROADCAST_WHATSAPP_TEMPLATES as readonly string[]).join(", ")}`);
    }
    const row = await broadcastRepository.createCampaign({
      title: input.title,
      channel: input.channel,
      templateKey: input.templateKey?.trim() || null,
      subject: input.subject?.trim() || null,
      bodyHtml: input.bodyHtml?.trim() || null,
      createdByUserId: staff.id,
    });
    if (!row) throw new AppError(500, "CAMPAIGN_CREATE_FAILED", "Falha ao criar campanha");
    return row;
  },

  async listCampaigns(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const { items, total } = await broadcastRepository.listCampaigns(page, limit);
    return { items, total, page, limit };
  },

  async getCampaign(id: string) {
    const row = await broadcastRepository.findCampaignById(id);
    if (!row) throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campanha não encontrada");
    const remaining = await broadcastRepository.countPending(id);
    return { ...row, remaining };
  },

  /** Materializa a audiência (todas as empresas com contacto válido no canal). */
  async prepare(id: string) {
    const campaign = await broadcastRepository.findCampaignById(id);
    if (!campaign) throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campanha não encontrada");
    if (campaign.status !== "draft") throw new AppError(409, "INVALID_STATUS", "Só rascunhos podem ser preparados");
    const contacts = await broadcastRepository.listAllCompanyContacts();
    const seen = new Set<string>();
    const rows: { organizationId: string | null; address: string; companyName: string | null }[] = [];
    for (const c of contacts) {
      let address: string | null = null;
      if (campaign.channel === "email") {
        const email = (c.contactEmail ?? c.profileEmail ?? "").trim();
        if (isEmail(email)) address = email.toLowerCase();
      } else {
        address = resolvePhone(c.contactPhone ?? c.profileWhatsapp ?? c.profilePhone);
      }
      if (!address || seen.has(address)) continue;
      seen.add(address);
      rows.push({ organizationId: c.organizationId, address, companyName: c.name });
    }
    const inserted = await broadcastRepository.insertRecipients(id, rows);
    await broadcastRepository.setTotals(id, inserted);
    await broadcastRepository.setStatus(id, "ready");
    return this.getCampaign(id);
  },

  /**
   * Envia um lote de pendentes (resumível: repete até remaining=0).
   * Marca a campanha como enviada quando não restam pendentes.
   */
  async sendBatch(id: string, limit = 25) {
    const campaign = await broadcastRepository.findCampaignById(id);
    if (!campaign) throw new AppError(404, "CAMPAIGN_NOT_FOUND", "Campanha não encontrada");
    if (campaign.status !== "ready" && campaign.status !== "sending") {
      throw new AppError(409, "INVALID_STATUS", "Campanha precisa de estar preparada");
    }
    if (campaign.status === "ready") await broadcastRepository.setStatus(id, "sending");
    const pending = await broadcastRepository.takePending(id, Math.min(Math.max(limit, 1), 50));
    let sent = 0;
    let failed = 0;
    for (const r of pending) {
      const outcome = await this.sendToAddress(campaign, r.address, r.companyName);
      if (outcome === "sent") {
        sent++;
        await broadcastRepository.markSent(r.id);
      } else if (outcome === "skipped") {
        await broadcastRepository.markSkipped(r.id, "canal indisponível ou endereço inválido");
      } else {
        failed++;
        await broadcastRepository.markFailed(r.id, "falha de envio");
      }
      await sleep(BATCH_DELAY_MS);
    }
    await broadcastRepository.addCounts(id, sent, failed);
    const remaining = await broadcastRepository.countPending(id);
    if (remaining === 0) await broadcastRepository.setStatus(id, "sent");
    return { sent, failed, remaining, total: campaign.totalRecipients };
  },

  async sendToAddress(
    campaign: { channel: BroadcastChannel; templateKey: string | null; subject: string | null; bodyHtml: string | null },
    address: string,
    companyName: string | null,
  ): Promise<"sent" | "skipped" | "failed"> {
    if (campaign.channel === "whatsapp") {
      if (!campaign.templateKey) return "skipped";
      // Par workdeal_introduction + onboarding_request: a introdução vai primeiro.
      if (campaign.templateKey === "onboarding_request") {
        const intro = await sendWhatsappTemplate({ to: address, templateName: process.env.WHATSAPP_INTRODUCTION_TEMPLATE ?? "workdeal_introduction", templateParams: [] });
        if (intro.outcome !== "sent") return intro.outcome;
      }
      const res = await sendWhatsappTemplate({ to: address, templateName: campaign.templateKey, templateParams: [companyName ?? address] });
      return res.outcome;
    }
    if (campaign.channel === "sms") {
      if (!campaign.bodyHtml?.trim()) return "skipped";
      const res = await sendSms({ to: address, message: renderVars(campaign.bodyHtml, companyName) });
      return res.outcome;
    }
    // email: conteúdo livre com {{company}}
    if (!campaign.subject?.trim() || !campaign.bodyHtml?.trim()) return "skipped";
    const res = await sendEmail({ to: address, subject: renderVars(campaign.subject, companyName), html: renderVars(campaign.bodyHtml, companyName) });
    return res.outcome;
  },

  /** Envio individual imediato (empresa ou endereço directo). */
  async sendIndividual(staff: AuthUser, input: SendIndividualMessageInput) {
    let address: string | null = null;
    let companyName: string | null = null;
    let organizationId: string | null = null;
    if (input.organizationId) {
      const org = await broadcastRepository.findOrganization(input.organizationId);
      if (!org) throw new AppError(404, "ORGANIZATION_NOT_FOUND", "Empresa não encontrada");
      organizationId = org.id;
      companyName = org.name;
      if (input.channel === "email") {
        const email = (org.contactEmail ?? org.profileEmail ?? "").trim();
        if (!isEmail(email)) throw new AppError(400, "NO_CONTACT", "Empresa sem email válido");
        address = email.toLowerCase();
      } else {
        const phone = resolvePhone(org.contactPhone ?? org.profileWhatsapp ?? org.profilePhone);
        if (!phone) throw new AppError(400, "NO_CONTACT", "Empresa sem telefone válido");
        address = phone;
      }
    } else {
      const raw = (input.to ?? "").trim();
      if (input.channel === "email") {
        if (!isEmail(raw)) throw new AppError(400, "INVALID_ADDRESS", "Email inválido");
        address = raw.toLowerCase();
      } else {
        const phone = resolvePhone(raw);
        if (!phone) throw new AppError(400, "INVALID_ADDRESS", "Telefone inválido");
        address = phone;
      }
    }
    const outcome = await this.sendToAddress(
      { channel: input.channel, templateKey: input.templateKey ?? null, subject: input.subject ?? null, bodyHtml: input.body ?? null },
      address,
      companyName,
    );
    if (outcome === "failed") throw new AppError(502, "SEND_FAILED", "Falha ao enviar mensagem");
    return { channel: input.channel, address, organizationId, outcome, sentBy: staff.id };
  },
};
