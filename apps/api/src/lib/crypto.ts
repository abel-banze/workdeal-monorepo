import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../env.js";

export class CryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CryptoError";
  }
}

function masterKey(): Buffer {
  const secret = env.AI_CREDENTIALS_MASTER_KEY;
  if (!secret) {
    throw new CryptoError("AI_CREDENTIALS_MASTER_KEY não está configurada — impossível encriptar credenciais");
  }
  // Deriva uma chave de 32 bytes (AES-256) a partir do segredo, em qualquer comprimento.
  return createHash("sha256").update(secret).digest();
}

const PREAMBLE = "aes256gcm.v1.";

/** Encripta um segredo (ex: API key de IA) com AES-256-GCM. IV único por valor. */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new CryptoError("Não é possível encriptar um segredo vazio");
  const key = masterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREAMBLE}${[iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".")}`;
}

/** Desencripta um payload criado por `encryptSecret`. Lança CryptoError se inválido. */
export function decryptSecret(payload: string): string {
  if (!payload.startsWith(PREAMBLE)) throw new CryptoError("Payload não reconhecido como encriptado pela Workdeal");
  const body = payload.slice(PREAMBLE.length);
  const parts = body.split(".");
  if (parts.length !== 3) throw new CryptoError("Payload encriptado inválido");
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  try {
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64url"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
  } catch (err) {
    throw new CryptoError(`Falha ao desencriptar credencial: ${err instanceof Error ? err.message : "erro desconhecido"}`);
  }
}

/** Mascara um segredo para mostrar na UI (últimos 4 chars). */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••••••${secret.slice(-4)}`;
}