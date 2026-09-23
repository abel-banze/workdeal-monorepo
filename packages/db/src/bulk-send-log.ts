import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { bulkSendLog } from "./schema.js";

// Estado de envios em massa por (empresa, template, canal): usado pelos
// scripts bulk para saltar quem já recebeu (resume entre lotes) e auditar
// a cobertura de cada template.

export async function getBulkSendAt(organizationId: string, template: string, channel = "whatsapp"): Promise<string | null> {
  const [row] = await db
    .select({ sentAt: bulkSendLog.sentAt })
    .from(bulkSendLog)
    .where(
      and(
        eq(bulkSendLog.organizationId, organizationId),
        eq(bulkSendLog.template, template),
        eq(bulkSendLog.channel, channel),
      ),
    )
    .limit(1);
  return row ? row.sentAt.toISOString() : null;
}

export async function markBulkSent(organizationId: string, template: string, channel = "whatsapp"): Promise<void> {
  await db
    .insert(bulkSendLog)
    .values({ organizationId, template, channel })
    .onConflictDoUpdate({
      target: [bulkSendLog.organizationId, bulkSendLog.template, bulkSendLog.channel],
      set: { sentAt: new Date() },
    });
}
