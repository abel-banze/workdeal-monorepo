import type { AuthUser, FilePurpose } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { filesRepository } from "../repositories/files.repository.js";
import { env } from "../env.js";

const ALLOWED_MIME_PREFIXES = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument"];
const MAX_BYTES = 10 * 1024 * 1024;
const MOCK_PUBLIC_ID_PREFIX = "mock/";

function isBlockedMime(mime: string): boolean {
  return /\/(x-)?executable|javascript|html/.test(mime);
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

// Resolve a configuração do Cloudinary aceitando três convenções:
//  - nomes canónicos: CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
//  - aliases curtos:  CLOUDINARY_NAME / CLOUDINARY_API / CLOUDINARY_SECRET
//  - CLOUDINARY_URL standard: cloudinary://api_key:api_secret@cloud_name
// (canónicos têm prioridade; opcionais curtas depois; URL por último)
function getCloudinary(): CloudinaryConfig | null {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER, CLOUDINARY_URL, CLOUDINARY_NAME, CLOUDINARY_API, CLOUDINARY_SECRET } = env;
  let cloudName = CLOUDINARY_CLOUD_NAME;
  let apiKey = CLOUDINARY_API_KEY;
  let apiSecret = CLOUDINARY_API_SECRET;

  if (CLOUDINARY_URL && (!cloudName || !apiKey || !apiSecret)) {
    const m = /^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)$/.exec(CLOUDINARY_URL);
    if (m) {
      cloudName = cloudName ?? m[3];
      apiKey = apiKey ?? m[1];
      apiSecret = apiSecret ?? m[2];
    }
  }
  cloudName = cloudName ?? CLOUDINARY_NAME;
  apiKey = apiKey ?? CLOUDINARY_API;
  apiSecret = apiSecret ?? CLOUDINARY_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    // Fail fast em produção — nunca servir URLs mock a utilizadores reais
    if (env.NODE_ENV === "production") {
      throw new AppError(503, "STORAGE_NOT_CONFIGURED", "Armazenamento de ficheiros não configurado");
    }
    return null; // dev/test: modo mock
  }
  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: CLOUDINARY_FOLDER ?? "workdeal",
  };
}

function canManage(user: AuthUser, uploadedByUserId: string | null): boolean {
  return user.systemRole === "admin" || user.systemRole === "moderator" || (uploadedByUserId !== null && uploadedByUserId === user.id);
}

export const filesService = {
  async upload(buffer: Buffer, originalFilename: string, mimeType: string, uploadedByUserId: string | null, purpose: FilePurpose) {
    if (buffer.length > MAX_BYTES) throw new AppError(413, "FILE_TOO_LARGE", "Ficheiro excede 10MB");
    // permitir generic fallback mas bloquear executáveis
    if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p)) && isBlockedMime(mimeType)) {
      throw new AppError(400, "INVALID_FILE_TYPE", "Tipo de ficheiro não permitido");
    }

    const cloudCfg = getCloudinary();

    // Mock quando cloudinary não configurado — útil para dev/test
    if (!cloudCfg) {
      const mockUrl = `https://mock.cloudinary.local/${Date.now()}-${encodeURIComponent(originalFilename)}`;
      const row = await filesRepository.create({
        url: mockUrl,
        publicId: `${MOCK_PUBLIC_ID_PREFIX}${Date.now()}-${originalFilename}`,
        resourceType: mimeType.startsWith("image/") ? "image" : "raw",
        format: originalFilename.split(".").pop()?.toLowerCase() ?? null,
        bytes: buffer.length,
        originalFilename,
        uploadedByUserId,
      });
      return row;
    }

    // Cloudinary upload via data URI (evita stream complexity em serverless)
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: cloudCfg.cloudName,
      api_key: cloudCfg.apiKey,
      api_secret: cloudCfg.apiSecret,
    });

    const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
    const folder = `${cloudCfg.folder}/${purpose}`;

    try {
      const res = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "auto",
        public_id: `${Date.now()}-${originalFilename.replace(/\.[^.]+$/, "").slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        overwrite: false,
      });

      const row = await filesRepository.create({
        url: res.secure_url as string,
        publicId: res.public_id as string,
        resourceType: (res.resource_type as string) ?? (mimeType.startsWith("image/") ? "image" : "raw"),
        format: (res.format as string) ?? originalFilename.split(".").pop()?.toLowerCase() ?? null,
        bytes: (res.bytes as number) ?? buffer.length,
        originalFilename,
        uploadedByUserId,
      });
      return row;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new AppError(500, "UPLOAD_FAILED", `Falha ao carregar para Cloudinary: ${msg.slice(0, 300)}`);
    }
  },

  async getById(id: string, user: AuthUser) {
    const row = await filesRepository.findById(id);
    if (!row) throw new AppError(404, "FILE_NOT_FOUND", "Ficheiro não encontrado");
    if (!canManage(user, row.uploadedByUserId)) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para aceder a este ficheiro");
    }
    return row;
  },

  async remove(id: string, user: AuthUser) {
    const row = await filesRepository.findById(id);
    if (!row) throw new AppError(404, "FILE_NOT_FOUND", "Ficheiro não encontrado");
    if (!canManage(user, row.uploadedByUserId)) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para remover este ficheiro");
    }

    // Remover do Cloudinary primeiro; publicIds mock (dev) não existem lá
    if (!row.publicId.startsWith(MOCK_PUBLIC_ID_PREFIX)) {
      const cfg = getCloudinary();
      if (cfg) {
        try {
          const { v2: cloudinary } = await import("cloudinary");
          cloudinary.config({
            cloud_name: cfg.cloudName,
            api_key: cfg.apiKey,
            api_secret: cfg.apiSecret,
          });
          await cloudinary.uploader.destroy(row.publicId, {
            resource_type: (row.resourceType as "image" | "video" | "raw") || "image",
          });
        } catch {
          // falha ao remover no Cloudinary não bloqueia a remoção local
        }
      }
    }

    await filesRepository.remove(id);
    return { id };
  },
};
