import { HiCheckBadge } from "react-icons/hi2";

export type VerificationDegree = 1 | 2 | 3;

type Props = {
  degree: VerificationDegree;
  size?: number;
  title?: string;
};

const COLORS: Record<VerificationDegree, string> = {
  1: "#2563EB",
  2: "#9CA3AF",
  3: "#D1D5DB",
};

const TITLES: Record<VerificationDegree, string> = {
  1: "Identidade verificada (1º grau)",
  2: "Identidade em legalização (2º grau)",
  3: "Sem verificação de identidade (3º grau)",
};

/**
 * Badge de verificação de identidade (HiCheckBadge do react-icons/hi2).
 * Sem fundo — a cor do ícone codifica o grau:
 * - 1º grau: azul
 * - 2º grau: cinzento
 * - 3º grau: cinzento claro
 */
export function VerificationBadge({ degree, size = 24, title }: Props) {
  return (
    <HiCheckBadge
      title={title ?? TITLES[degree]}
      color={COLORS[degree]}
      size={size}
      className="shrink-0 select-none"
      aria-hidden
    />
  );
}

export function degreeFromBadges(badges: { slug: string; status?: string }[]): VerificationDegree {
  const active = badges.filter((b) => !b.status || b.status === "active");
  if (active.some((b) => b.slug === "verified")) return 1;
  if (active.some((b) => b.slug === "in-legalization")) return 2;
  return 3;
}
