import { and, asc, desc, eq, notInArray } from "drizzle-orm";
import { db, aiConversation, aiConversationMessage } from "@workdeal/db";

export type ConversationRole = "user" | "assistant";

export interface ConversationScope {
  key: string;
  userId: string;
  organizationId: string | null;
  agentKey: string;
  profileId: string | null;
}

export type ConversationRow = typeof aiConversation.$inferSelect;
export type ConversationMessageRow = typeof aiConversationMessage.$inferSelect;

class ConversationsRepository {
  async findByKey(key: string): Promise<ConversationRow | null> {
    const [row] = await db.select().from(aiConversation).where(eq(aiConversation.key, key)).limit(1);
    return row ?? null;
  }

  /** Cria ou devolve a conversa do âmbito (corrida segura via `key` única). */
  async findOrCreate(scope: ConversationScope): Promise<ConversationRow> {
    const [inserted] = await db
      .insert(aiConversation)
      .values({
        key: scope.key,
        userId: scope.userId,
        organizationId: scope.organizationId,
        agentKey: scope.agentKey,
        profileId: scope.profileId,
      })
      .onConflictDoNothing({ target: [aiConversation.key] })
      .returning();
    if (inserted) return inserted;
    const existing = await this.findByKey(scope.key);
    if (!existing) throw new Error("Falha ao criar conversa");
    return existing;
  }

  async appendTurn(conversationId: string, role: ConversationRole, text: string): Promise<void> {
    await db.insert(aiConversationMessage).values({ conversationId, role, text });
    await db.update(aiConversation).set({ updatedAt: new Date() }).where(eq(aiConversation.id, conversationId));
  }

  /** Últimos N turnos por ordem cronológica (mais antigo primeiro). */
  async listRecentTurns(conversationId: string, limit: number): Promise<ConversationMessageRow[]> {
    const newestFirst = await db
      .select()
      .from(aiConversationMessage)
      .where(eq(aiConversationMessage.conversationId, conversationId))
      .orderBy(desc(aiConversationMessage.createdAt), desc(aiConversationMessage.id))
      .limit(limit);
    return [...newestFirst].reverse();
  }

  async countTurns(conversationId: string): Promise<number> {
    const rows = await db
      .select({ id: aiConversationMessage.id })
      .from(aiConversationMessage)
      .where(eq(aiConversationMessage.conversationId, conversationId));
    return rows.length;
  }

  async setSummary(conversationId: string, summary: string): Promise<void> {
    await db.update(aiConversation).set({ summary, updatedAt: new Date() }).where(eq(aiConversation.id, conversationId));
  }

  /** Apaga tudo excepto os `keepNewest` turnos mais recentes. */
  async deleteOldest(conversationId: string, keepNewest: number): Promise<void> {
    const kept = await db
      .select({ id: aiConversationMessage.id })
      .from(aiConversationMessage)
      .where(eq(aiConversationMessage.conversationId, conversationId))
      .orderBy(desc(aiConversationMessage.createdAt), desc(aiConversationMessage.id))
      .limit(keepNewest);
    if (kept.length === 0) return;
    await db
      .delete(aiConversationMessage)
      .where(and(eq(aiConversationMessage.conversationId, conversationId), notInArray(aiConversationMessage.id, kept.map((r) => r.id))));
  }
}

export const conversationsRepository = new ConversationsRepository();
