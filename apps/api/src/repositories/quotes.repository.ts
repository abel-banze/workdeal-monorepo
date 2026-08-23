import { db, quoteRequest, quoteFile, file, member, organization, profile } from "@workdeal/db";
import { eq, and, desc, count, inArray } from "drizzle-orm";

type QuoteStatus = (typeof quoteRequest.status.enumValues)[number];
const asStatus = (s: string) => s as QuoteStatus;

export const quotesRepository = {
  async create(data: typeof quoteRequest.$inferInsert) {
    const [row] = await db.insert(quoteRequest).values(data).returning();
    if (!row) throw new Error("Falha ao criar pedido de cotação");
    return row;
  },

  async findById(id: string) {
    const [row] = await db.select().from(quoteRequest).where(eq(quoteRequest.id, id)).limit(1);
    return row ?? null;
  },

  async listIncoming(targetProfileIds: string[], status: string | undefined, page: number, limit: number) {
    const primaryTargetId = targetProfileIds[0];
    if (!primaryTargetId) return { items: [], total: 0 };
    const where = status
      ? and(eq(quoteRequest.targetProfileId, primaryTargetId), eq(quoteRequest.status, asStatus(status)))
      : undefined;
    // Simplificado: filtra por primeiro profile; se quiser multi-profile, usar inArray (mantido simples para MVP)
    const base = where ? db.select().from(quoteRequest).where(where) : db.select().from(quoteRequest);
    // Drizzle não tem inArray dinâmico simples sem import, usa query raw se multi
    // Para MVP, se houver múltiplos ids, buscar todos e filtrar em memória não escala — mas equipa pequena; fazemos segunda query
    let items: (typeof quoteRequest.$inferSelect)[];
    let total: number;
    if (targetProfileIds.length === 1) {
      const cond = status ? and(eq(quoteRequest.targetProfileId, primaryTargetId), eq(quoteRequest.status, asStatus(status))) : eq(quoteRequest.targetProfileId, primaryTargetId);
      const [cntRow] = await db.select({ cnt: count() }).from(quoteRequest).where(cond);
      total = cntRow?.cnt ?? 0;
      items = await db.select().from(quoteRequest).where(cond).orderBy(desc(quoteRequest.createdAt)).limit(limit).offset((page - 1) * limit);
    } else {
      // Fallback: busca todos com inArray via sql helper
      const cond = status ? and(inArray(quoteRequest.targetProfileId, targetProfileIds), eq(quoteRequest.status, asStatus(status))) : inArray(quoteRequest.targetProfileId, targetProfileIds);
      const [cntRow] = await db.select({ cnt: count() }).from(quoteRequest).where(cond);
      total = cntRow?.cnt ?? 0;
      items = await db.select().from(quoteRequest).where(cond).orderBy(desc(quoteRequest.createdAt)).limit(limit).offset((page - 1) * limit);
    }
    return { items, total };
  },

  async listOutgoing(requesterUserId: string, status: string | undefined, page: number, limit: number) {
    const cond = status ? and(eq(quoteRequest.requesterUserId, requesterUserId), eq(quoteRequest.status, asStatus(status))) : eq(quoteRequest.requesterUserId, requesterUserId);
    const [cntRow] = await db.select({ cnt: count() }).from(quoteRequest).where(cond);
    const items = await db.select().from(quoteRequest).where(cond).orderBy(desc(quoteRequest.createdAt)).limit(limit).offset((page - 1) * limit);
    return { items, total: cntRow?.cnt ?? 0 };
  },

  async updateStatus(id: string, status: string) {
    const [row] = await db.update(quoteRequest).set({ status: asStatus(status), updatedAt: new Date() }).where(eq(quoteRequest.id, id)).returning();
    return row ?? null;
  },

  async getTargetOwnerUserIds(targetProfileId: string): Promise<string[]> {
    const [prof] = await db.select({ organizationId: profile.organizationId, userId: profile.userId }).from(profile).where(eq(profile.id, targetProfileId)).limit(1);
    if (!prof) return [];
    if (prof.organizationId) {
      const owners = await db.select({ userId: member.userId }).from(member).where(and(eq(member.organizationId, prof.organizationId), eq(member.role, "owner")));
      if (owners.length) return owners.map((o) => o.userId);
      const fallback = await db.select({ userId: member.userId }).from(member).where(eq(member.organizationId, prof.organizationId));
      return fallback.map((o) => o.userId);
    }
    if (prof.userId) return [prof.userId];
    return [];
  },

  async getProfileContact(targetProfileId: string) {
    const [row] = await db.select({ whatsapp: profile.whatsapp, phone: profile.phone, email: profile.email, name: profile.name }).from(profile).where(eq(profile.id, targetProfileId)).limit(1);
    return row ?? null;
  },

  async attachFiles(quoteRequestId: string, fileIds: string[]) {
    if (fileIds.length === 0) return;
    const values = fileIds.map((fileId) => ({ quoteRequestId, fileId }));
    await db.insert(quoteFile).values(values).onConflictDoNothing();
  },

  async getFilesForQuote(quoteRequestId: string) {
    const rows = await db
      .select({
        id: file.id,
        url: file.url,
        publicId: file.publicId,
        resourceType: file.resourceType,
        format: file.format,
        bytes: file.bytes,
        originalFilename: file.originalFilename,
        createdAt: file.createdAt,
      })
      .from(quoteFile)
      .innerJoin(file, eq(quoteFile.fileId, file.id))
      .where(eq(quoteFile.quoteRequestId, quoteRequestId));
    return rows;
  },

  async getFilesForQuotes(quoteIds: string[]) {
    if (quoteIds.length === 0) return new Map<string, typeof file.$inferSelect[]>();
    const rows = await db
      .select({
        quoteRequestId: quoteFile.quoteRequestId,
        id: file.id,
        url: file.url,
        publicId: file.publicId,
        resourceType: file.resourceType,
        format: file.format,
        bytes: file.bytes,
        originalFilename: file.originalFilename,
        createdAt: file.createdAt,
      })
      .from(quoteFile)
      .innerJoin(file, eq(quoteFile.fileId, file.id))
      .where(inArray(quoteFile.quoteRequestId, quoteIds));
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = map.get(r.quoteRequestId) ?? [];
      arr.push(r as never);
      map.set(r.quoteRequestId, arr);
    }
    return map;
  },
};
