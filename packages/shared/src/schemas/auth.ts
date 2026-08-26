import { z } from "zod";
import { isValidMzPhone } from "../lib/phone.js";

export const emailSchema = z.string().trim().email().max(255);
export const passwordSchema = z.string().min(8, "A palavra-passe deve ter pelo menos 8 caracteres").max(128);

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  phone: z
    .string()
    .trim()
    .min(1, "Número de telemóvel é obrigatório")
    .refine((v) => isValidMzPhone(v), "Número de telemóvel inválido. Ex: 84 123 4567"),
  profileType: z.enum(["individual", "company"]).default("individual"),
  organizationName: z.string().trim().min(2).max(120).optional(),
  organizationSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas minúsculas, números e hífens")
    .max(64)
    .optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
});

export const organizationInviteSchema = z.object({
  organizationId: z.string().min(1),
  email: emailSchema,
  role: z.enum(["owner", "admin", "editor", "member"]).default("member"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type OrganizationInviteInput = z.infer<typeof organizationInviteSchema>;
