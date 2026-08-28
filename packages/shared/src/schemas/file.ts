import { z } from "zod";

export const FILE_PURPOSES = ["quote", "avatar", "logo", "verification", "generic"] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

export const uploadFileSchema = z.object({
  purpose: z.enum(FILE_PURPOSES).default("generic"),
});

export type UploadFileInput = z.infer<typeof uploadFileSchema>;
