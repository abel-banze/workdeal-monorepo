import { z } from "zod";

// Normalização de website — usada pelos schemas Zod partilhados e pelos
// formulários web. Muitos utilizadores escrevem "empresa.co.mz" sem esquema;
// em vez de rejeitar, assume-se https:// (nunca se adivinha http://).
export function normalizeWebsite(input: string | null | undefined): string | null {
  if (input == null) return null;
  const v = input.trim();
  if (!v) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  return `https://${v}`;
}

export function websiteHostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

// Campo website partilhado (perfis, empresas, instituições): aceita com ou
// sem esquema, normaliza para URL completa e exige um hostname com ponto
// para não aceitar lixo como "abc".
export const websiteSchema = z.preprocess(
  (v) => (typeof v === "string" ? normalizeWebsite(v) : v),
  z
    .string()
    .trim()
    .url("Website inválido — ex: empresa.co.mz")
    .max(255)
    .refine((s) => websiteHostname(s)?.includes(".") ?? false, "Website inválido — ex: empresa.co.mz")
    .nullable()
    .optional(),
);

export type WebsiteInput = z.infer<typeof websiteSchema>;
