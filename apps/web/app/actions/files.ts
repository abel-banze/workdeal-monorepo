"use server";

import { cookies } from "next/headers";
import { JWT_COOKIE_NAME } from "@workdeal/auth/cookies";
import { env } from "@/lib/env";

export type UploadFileResult =
  | { ok: true; file: { id: string; url: string; publicId: string; resourceType: string; format: string | null; bytes: number | null; originalFilename: string | null } }
  | { ok: false; error: string; file?: undefined };

export async function uploadFilesAction(formData: FormData): Promise<UploadFileResult> {
  // Login opcional — convidados podem anexar ficheiros a cotações
  // (a API restringe uploads anónimos a purpose=quote)
  const token = (await cookies()).get(JWT_COOKIE_NAME)?.value ?? null;

  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Ficheiro em falta." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Ficheiro excede 10MB." };

  const purpose = formData.get("purpose");
  const purposeValue = typeof purpose === "string" && purpose.length > 0 ? purpose : "generic";

  const apiUrl = `${env.API_URL}/api/v1/files/upload`;
  const fd = new FormData();
  fd.set("file", file, file.name);
  fd.set("purpose", purposeValue);

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as { success?: boolean; data?: unknown; error?: { message?: string } } | null;
    if (!res.ok || !json?.success) {
      const msg = json?.error?.message ?? `Falha no upload: ${res.status}`;
      return { ok: false, error: msg.slice(0, 500) };
    }
    const data = json.data as { id: string; url: string; public_id?: string; publicId?: string; resource_type?: string; resourceType?: string; format?: string | null; bytes?: number | null; original_filename?: string | null; originalFilename?: string | null };
    return {
      ok: true,
      file: {
        id: data.id,
        url: data.url,
        publicId: (data.public_id ?? data.publicId ?? "") as string,
        resourceType: (data.resource_type ?? data.resourceType ?? "raw") as string,
        format: (data.format ?? null) as string | null,
        bytes: (data.bytes ?? file.size) as number | null,
        originalFilename: (data.original_filename ?? data.originalFilename ?? file.name) as string | null,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500) };
  }
}
