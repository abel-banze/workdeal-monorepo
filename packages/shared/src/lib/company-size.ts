import { z } from "zod";

export const companySizeEnum = z.enum(["micro", "pequena", "media", "grande"]);
export type CompanySize = z.infer<typeof companySizeEnum>;

export const legalFormEnum = z.enum(["lda", "su", "unipessoal", "cooperativa", "outro"]);
export type LegalForm = z.infer<typeof legalFormEnum>;

// Thresholds IPEME Moçambique (aproximados, configuráveis)
// Fonte: IPEME — Micro 1-4, Pequena 5-49, Média 50-100, Grande >100 trabalhadores
// Volume de negócios (MZN) secundário: micro ≤1.2M, pequena ≤14.7M, média ≤30M
export const COMPANY_SIZE_BY_WORKERS: Record<CompanySize, { min: number; max: number }> = {
  micro: { min: 1, max: 4 },
  pequena: { min: 5, max: 49 },
  media: { min: 50, max: 100 },
  grande: { min: 101, max: Number.POSITIVE_INFINITY },
};

export const COMPANY_SIZE_BY_TURNOVER_MZN: Record<CompanySize, { max: number }> = {
  micro: { max: 1_200_000 },
  pequena: { max: 14_700_000 },
  media: { max: 30_000_000 },
  grande: { max: Number.POSITIVE_INFINITY },
};

export function classifyCompanySize(input: { workers: number; turnoverMzn?: number | null }): CompanySize {
  const w = Math.max(1, Math.floor(input.workers));
  if (w <= 4) return "micro";
  if (w <= 49) return "pequena";
  if (w <= 100) return "media";
  return "grande";
}

export function classifyByTurnover(turnoverMzn: number): CompanySize {
  if (turnoverMzn <= 1_200_000) return "micro";
  if (turnoverMzn <= 14_700_000) return "pequena";
  if (turnoverMzn <= 30_000_000) return "media";
  return "grande";
}

export function sizeLabel(size: CompanySize): string {
  const labels: Record<CompanySize, string> = {
    micro: "Microempresa",
    pequena: "Pequena Empresa",
    media: "Média Empresa",
    grande: "Grande Empresa",
  };
  return labels[size];
}

export function sizeDescription(size: CompanySize): string {
  const r = COMPANY_SIZE_BY_WORKERS[size];
  if (size === "grande") return `> ${r.min - 1} trabalhadores`;
  return `${r.min}–${r.max} trabalhadores`;
}

export function isMPME(size: CompanySize): boolean {
  return size !== "grande";
}
