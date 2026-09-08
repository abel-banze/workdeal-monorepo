// Label central do conceito Instituição/Organização.
// Fonte única para renomear o termo em toda a UI sem tocar no código de domínio.
// O nome técnico do domínio é `institution` (tabela `institution`), distinto de
// `organization` (better-auth — equipas/empresas).
export const INSTITUTION_LABELS = {
  singular: "Instituição",
  plural: "Instituições",
  // Label de navegação pública (navbar/footer/títulos). "Organizações" mantém o
  // âmbito alargado (associações, câmaras, ONGs, ...) sem esbarrar em "Empresas".
  navLabel: "Organizações",
  // Slug de URL público na web (apps/web) — rota /organizations/[slug].
  urlSlug: "organizations",
} as const;

export type InstitutionLabels = (typeof INSTITUTION_LABELS)[keyof typeof INSTITUTION_LABELS];