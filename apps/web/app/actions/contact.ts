"use server";

import { z } from "zod";
import { env } from "@/lib/env";

const contactSchema = z.object({
  to: z.string().email("Email destino inválido"),
  fromName: z.string().trim().min(2, "Nome deve ter ≥2 caracteres").max(80),
  fromEmail: z.string().email("Email inválido"),
  message: z.string().trim().min(10, "Mensagem deve ter ≥10 caracteres").max(2000),
  profileName: z.string().trim().max(120).optional(),
  profileSlug: z.string().trim().max(80).optional(),
});

export async function sendContactEmail(input: z.infer<typeof contactSchema>): Promise<{ ok: boolean; error?: string }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { to, fromName, fromEmail, message, profileName } = parsed.data;

  const internalSecret = process.env.INTERNAL_API_SECRET;
  try {
    const base = env.API_URL.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/v1/email/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalSecret ? { "x-internal-secret": internalSecret } : {}),
      },
      body: JSON.stringify({ to, fromName, fromEmail, message, profileName }),
      cache: "no-store",
    });
    const text = await res.text().catch(() => "");
    interface EmailContactResponse { success?: boolean; error?: { message?: string } }
    let data: EmailContactResponse | null = null;
    try {
      data = text ? (JSON.parse(text) as EmailContactResponse) : null;
    } catch {}
    if (res.ok && data?.success !== false) return { ok: true };
    const msg = data?.error?.message ?? text.slice(0, 500) ?? `${res.status}`;
    return { ok: false, error: msg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
