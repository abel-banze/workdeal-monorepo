import type { AuthUser, FilePurpose } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { filesService } from "../services/files.service.js";

export const filesController = {
  async upload(uploadedByUserId: string | null, file: File, purpose: FilePurpose) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const row = await filesService.upload(buffer, file.name ?? "file", file.type || "application/octet-stream", uploadedByUserId, purpose);
    return { body: ok(row), status: 201 as const };
  },

  async get(user: AuthUser, id: string) {
    const row = await filesService.getById(id, user);
    return { body: ok(row), status: 200 as const };
  },

  async remove(user: AuthUser, id: string) {
    const result = await filesService.remove(id, user);
    return { body: ok(result), status: 200 as const };
  },
};
