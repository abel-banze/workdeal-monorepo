import { createRateLimiter } from "@workdeal/shared/lib/rate-limit";
import { AppError } from "../lib/errors.js";
import { quotesRepository } from "../repositories/quotes.repository.js";
import { db, organization, member, profile } from "@workdeal/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workdeal/shared";

const createLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

export const quotesService = {
  async assertCanCreate() {
    const r = createLimiter.check("quotes:create");
    if (!r.allowed) throw new AppError(429, "RATE_LIMITED", "Muitas cotações. Tente dentro de minutos.");
  },

  async createQuote(
    user: AuthUser | null,
    input: {
      targetProfileId: string;
      requesterOrganizationId?: string | null;
      serviceLabel: string;
      serviceTag?: string | null;
      portfolioItemId?: string | null;
      message: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string | null;
      fileIds?: string[];
    },
  ) {
    // Valida target existe
    const contact = await quotesRepository.getProfileContact(input.targetProfileId);
    if (!contact) throw new AppError(404, "PROFILE_NOT_FOUND", "Perfil destino não encontrado");

    // Organização solicitante só faz sentido para utilizadores autenticados;
    // valida pertença à organização
    let requesterOrganizationId: string | null = null;
    if (user && input.requesterOrganizationId) {
      const { and } = await import("drizzle-orm");
      const [exists] = await db
        .select()
        .from(member)
        .where(and(eq(member.userId, user.id), eq(member.organizationId, input.requesterOrganizationId)))
        .limit(1);
      if (!exists) throw new AppError(403, "FORBIDDEN", "Não pertence à organização solicitante");
      requesterOrganizationId = input.requesterOrganizationId;
    }

    const row = await quotesRepository.create({
      targetProfileId: input.targetProfileId,
      requesterUserId: user?.id ?? null,
      requesterOrganizationId,
      serviceLabel: input.serviceLabel,
      serviceTag: input.serviceTag ?? null,
      portfolioItemId: input.portfolioItemId ?? null,
      message: input.message,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      status: "pending",
    });

    // Anexar ficheiros, se houver — valida existência; ficheiros com dono
    // só podem pertencer ao próprio solicitante (uploads de convidados ficam sem dono)
    if (input.fileIds && input.fileIds.length > 0) {
      const { filesRepository } = await import("../repositories/files.repository");
      const files = await filesRepository.findByIds(input.fileIds);
      if (files.length !== input.fileIds.length) {
        throw new AppError(400, "INVALID_FILE_IDS", "Um ou mais ficheiros não foram encontrados");
      }
      const foreign = files.find((f) => f.uploadedByUserId !== null && f.uploadedByUserId !== user?.id);
      if (foreign) throw new AppError(403, "FILE_OWNERSHIP", "Ficheiro não pertence ao solicitante");
      await quotesRepository.attachFiles(row.id, input.fileIds);
    }

    // Notificação WhatsApp — fire-and-forget, não bloqueia resposta
    // Template "quote_request": {{1}} = nome da empresa que recebe, {{2}} = nome do serviço
    void notifyWhatsApp(row.id, input.targetProfileId, input.serviceLabel).catch((e) =>
      console.error("[quotes] whatsapp notify falhou", (e as Error).message?.slice(0, 500)),
    );

    const files = input.fileIds?.length ? await quotesRepository.getFilesForQuote(row.id) : [];
    return { ...row, files };
  },

  async listQuotes(user: AuthUser, query: { role: "incoming" | "outgoing"; status?: string; page: number; limit: number }) {
    if (query.role === "outgoing") {
      const { items, total } = await quotesRepository.listOutgoing(user.id, query.status, query.page, query.limit);
      const filesMap = await quotesRepository.getFilesForQuotes(items.map((i) => i.id));
      const withFiles = items.map((it) => ({ ...it, files: filesMap.get(it.id) ?? [] }));
      return { items: withFiles, total, page: query.page, limit: query.limit };
    }
    // incoming: todos os perfis onde user é owner/member da org ou dono do profile
    const userMembers = await db.select({ organizationId: member.organizationId }).from(member).where(eq(member.userId, user.id));
    const orgIds = userMembers.map((m) => m.organizationId);
    let targetIds: string[] = [];
    if (orgIds.length) {
      const { inArray } = await import("drizzle-orm");
      const profs = await db.select({ id: profile.id }).from(profile).where(inArray(profile.organizationId, orgIds));
      targetIds = profs.map((p) => p.id);
    }
    // também perfis individuais do user
    const own = await db.select({ id: profile.id }).from(profile).where(eq(profile.userId, user.id));
    targetIds.push(...own.map((p) => p.id));
    if (targetIds.length === 0) return { items: [], total: 0, page: query.page, limit: query.limit };
    const { items, total } = await quotesRepository.listIncoming(targetIds, query.status, query.page, query.limit);
    const filesMap = await quotesRepository.getFilesForQuotes(items.map((i) => i.id));
    const withFiles = items.map((it) => ({ ...it, files: filesMap.get(it.id) ?? [] }));
    return { items: withFiles, total, page: query.page, limit: query.limit };
  },

  async getQuote(user: AuthUser, id: string) {
    const row = await quotesRepository.findById(id);
    if (!row) throw new AppError(404, "QUOTE_NOT_FOUND", "Cotação não encontrada");
    // Autorização: requester ou target owner
    const isRequester = row.requesterUserId === user.id;
    let isOwner = false;
    if (!isRequester) {
      const owners = await quotesRepository.getTargetOwnerUserIds(row.targetProfileId);
      isOwner = owners.includes(user.id);
      if (!isOwner) throw new AppError(403, "FORBIDDEN", "Sem permissão para ver esta cotação");
    }
    const files = await quotesRepository.getFilesForQuote(row.id);
    return { ...row, files };
  },

  async updateStatus(user: AuthUser, id: string, status: string) {
    const row = await quotesRepository.findById(id);
    if (!row) throw new AppError(404, "QUOTE_NOT_FOUND", "Cotação não encontrada");
    const owners = await quotesRepository.getTargetOwnerUserIds(row.targetProfileId);
    const isOwner = owners.includes(user.id);
    const isRequester = row.requesterUserId === user.id;
    // Apenas target pode avançar para viewed/quoted/declined; requester pode fechar
    const allowed = (isOwner && ["viewed", "quoted", "declined", "closed"].includes(status)) || (isRequester && status === "closed");
    if (!allowed) throw new AppError(403, "FORBIDDEN", "Transição não permitida");
    const updated = await quotesRepository.updateStatus(id, status);
    return updated!;
  },
};

async function notifyWhatsApp(quoteId: string, targetProfileId: string, serviceLabel: string) {
  const contact = await quotesRepository.getProfileContact(targetProfileId);
  if (!contact) return;
  const to = (contact.whatsapp ?? contact.phone ?? "").replace(/\D/g, "");
  if (!to) {
    console.warn(`[quotes whatsapp] sem whatsapp/phone para perfil ${targetProfileId} — cotação ${quoteId} não notificada por WhatsApp`);
    return;
  }
  const token = process.env.ZERNIO_API_KEY ?? process.env.WHATSAPP_API_TOKEN;
  const accountId = process.env.ZERNIO_PHONE_ID;
  if (!token || !accountId) {
    console.warn(`[quotes whatsapp] ZERNIO_API_KEY/PHONE_ID em falta — mock: enviaria para +${to} template quote_request ({{1}}=${contact.name}, {{2}}=${serviceLabel}) cotação ${quoteId}`);
    return;
  }
  // Template "quote_request": {{1}} -> nome da empresa que recebe, {{2}} -> nome do serviço
  const templateName = process.env.WHATSAPP_QUOTE_TEMPLATE ?? "quote_request";
  const templateLanguage = "pt_PT";
  const companyName = contact.name;
  console.log(`[quotes whatsapp] enviando para +${to} template=${templateName} quote=${quoteId} {{1}}="${companyName}" {{2}}="${serviceLabel}" via account ${accountId}`);
  try {
    const url = "https://zernio.com/api/v1/inbox/conversations";
    const body = {
      accountId,
      participantId: to,
      templateName,
      templateLanguage,
      templateParams: [companyName, serviceLabel],
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error(`[quotes whatsapp] Zernio falhou ${res.status} ${text.slice(0, 800)} — cotação ${quoteId}`);
      return;
    }
    console.log(`[quotes whatsapp] enviado cotação ${quoteId} para +${to} template ${templateName}`);
  } catch (e) {
    console.error(`[quotes whatsapp] erro fetch cotação ${quoteId}:`, (e as Error).message?.slice(0, 800));
  }
}
