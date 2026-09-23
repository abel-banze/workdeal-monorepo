import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { normalizeMzPhone } from "@workdeal/shared/lib/phone";
import { db } from "./client.js";
import { organization, profile } from "./schema.js";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

// Disparo WhatsApp em massa para TODAS as empresas a convidar sobre
// concursos públicos, com o telefone resolvido por: organization.contactPhone
// → profile.whatsapp → profile.phone. Empresas sem telefone válido são saltadas.
//
// Template: new_tenders (override via WHATSAPP_NEW_TENDERS_TEMPLATE).
// NOTA: os parâmetros abaixo assumem {{1}} = nome da empresa — têm de bater
// certo com o template aprovado no Zernio (ver lib/message-templates.ts).
// Segurança igual ao send-tasks-cta:
//   - Por defeito é DRY-RUN (só lista quem receberia). Para enviar de verdade:
//       pnpm --filter @workdeal/db db:send:new-tenders -- --send
//   - `--limit=N` processa no máximo N empresas (para lotes).
//   - `--delay-ms=M` pausa entre envios (defeito 1500ms, evita rate-limit).
//   - Deduplica por número normalizado (mesmo telefone em várias empresas → envia 1x).
//   - Sem reenvio automático: o script não regista o envio; re-correr reenvia.

const TEMPLATE = process.env.WHATSAPP_NEW_TENDERS_TEMPLATE ?? "new_tenders";
const TEMPLATE_LANGUAGE = "pt_PT";

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return null;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function log(msg: string) {
  console.log(`[send-new-tenders] ${msg}`);
}

function maskPhone(digits: string): string {
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

async function sendTemplateMessage(toDigits: string, companyName: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.ZERNIO_API_KEY ?? process.env.WHATSAPP_API_TOKEN;
  const accountId = process.env.ZERNIO_PHONE_ID;
  if (!token || !accountId) {
    return { ok: false, error: "ZERNIO_API_KEY/WHATSAPP_API_TOKEN ou ZERNIO_PHONE_ID em falta no .env" };
  }
  const res = await fetch("https://zernio.com/api/v1/inbox/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      accountId,
      participantId: toDigits,
      templateName: TEMPLATE,
      templateLanguage: TEMPLATE_LANGUAGE,
      templateParams: [companyName],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, error: `Zernio ${res.status} ${text.slice(0, 300)}` };
  }
  return { ok: true };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const send = hasFlag("send");
  const limitRaw = argValue("limit");
  const limit = limitRaw ? Math.max(1, Number.parseInt(limitRaw, 10) || 0) : Number.POSITIVE_INFINITY;
  const delayRaw = argValue("delay-ms");
  const delayMs = delayRaw ? Math.max(0, Number.parseInt(delayRaw, 10) || 0) : 1500;

  log(`Template "${TEMPLATE}" ({{1}} = nome da empresa). Modo: ${send ? "ENVIO REAL" : "DRY-RUN (usa --send para enviar)"}.`);

  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      contactPhone: organization.contactPhone,
      contactEmail: organization.contactEmail,
      profileWhatsapp: profile.whatsapp,
      profilePhone: profile.phone,
    })
    .from(organization)
    .leftJoin(profile, eq(profile.organizationId, organization.id));

  log(`${rows.length} empresa(s) no total.`);

  const seenPhones = new Set<string>();
  let queued = 0;
  let sent = 0;
  let failed = 0;
  let skippedBadPhone = 0;
  let skippedDuplicate = 0;

  for (const org of rows) {
    if (queued >= limit) break;
    const rawPhone = org.contactPhone ?? org.profileWhatsapp ?? org.profilePhone ?? "";
    // Normalização canónica MZ (258XXXXXXXXX) — igual aos restantes envios.
    const digits = normalizeMzPhone(rawPhone);
    if (!digits) {
      skippedBadPhone++;
      log(`SKIP telefone ausente/inválido: "${org.name}"`);
      continue;
    }
    if (seenPhones.has(digits)) {
      skippedDuplicate++;
      log(`SKIP duplicado: "${org.name}" (mesmo número que empresa anterior)`);
      continue;
    }
    seenPhones.add(digits);
    queued++;

    if (!send) {
      log(`[dry-run] enviaria para "${org.name}" → +${maskPhone(digits)}`);
      continue;
    }

    const result = await sendTemplateMessage(digits, org.name);
    if (result.ok) {
      sent++;
      log(`OK "${org.name}" → +${maskPhone(digits)}`);
    } else {
      failed++;
      log(`FALHA "${org.name}" → +${maskPhone(digits)}: ${result.error}`);
    }
    await sleep(delayMs);
  }

  log(`\nResumo: ${queued} na fila | ${send ? `${sent} enviadas, ${failed} falhas` : "dry-run, nada enviado"} | skips: ${skippedBadPhone} telefone ausente/inválido, ${skippedDuplicate} duplicados.`);
  if (!send) log("Para enviar de verdade, corre com --send (opcional: --limit=N --delay-ms=M).");
  if (send && failed > 0) process.exitCode = 1;
}

// @ts-ignore - Bunism
if ((import.meta as unknown as { main?: boolean }).main) {
  main()
    .then(() => process.exit(process.exitCode ?? 0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
