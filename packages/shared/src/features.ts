// ── Catálogo de features (única fonte de verdade) ──────────────────────────
// Lista completa das capacidades do produto. Cada feature tem uma chave estável
// (usada em `plan_feature.featureKey` e em `feature_flag.key`), rótulo/descrição
// em pt-MZ e o tipo de valor que transporta.
//
// Dois eixos, complementares:
//   - PLAN   → o que a subscrição/plano concede (entitlement comercial). As
//              chaves do plano vivem em `plan_feature` (com herança por plano).
//   - FLAG   → controlo operacional (activar/desactivar globalmente, por org,
//              kill-switch). Uma feature só é acessível se o plano a concede
//              E o flag (se existir) estiver ligado para o âmbito.
//
// Esta tabela é partilhada pelo seed dos planos, pelo seed de flags e pelos
// gates (Hono / Server Actions / admin). Nunca duplicar chaves à mão.

export const FEATURE_KEYS = [
  // Free
  "profile_basic",
  "profile_info",
  "products_services",
  "contacts_basic",
  "website_socials",
  "search_discovery",
  "view_opportunities",
  "view_events",
  "org_membership",
  "receive_contacts",
  "respond_opportunities",
  "negotiation_chat",
  // Workdeal Trust
  "verification_identity",
  "verification_nuit",
  "verification_documents",
  "verification_contacts",
  "verification_location",
  "verification_website",
  "badge_trust",
  "trust_verified_state",
  "search_boost",
  "trust_opportunity_priority",
  "trust_verification_history",
  // Premium
  "profile_advanced",
  "more_products_services",
  "multimedia_content",
  "profile_stats",
  "analytics_visits_contacts",
  "analytics_opportunities",
  "opportunity_alerts",
  "opportunity_matching",
  "partner_recommendations",
  "prospecting_tools",
  "contact_management",
  "team_multi_user",
  "ai_assistant",
  "ai_proposal_generation",
  "ai_response_support",
  "ai_profile_assistant",
  "priority_support",
  // Enterprise
  "multi_user_advanced",
  "team_management",
  "role_permissions",
  "multiple_branches",
  "procurement",
  "opportunity_management_advanced",
  "supplier_shortlists",
  "proposal_evaluation",
  "internal_workflows",
  "supplier_history",
  "analytics_advanced",
  "api_access",
  "integrations",
  "data_export",
  "dedicated_agent",
  "matching_advanced",
  "priority_support_enterprise",
  "dedicated_onboarding",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureValueType = "boolean" | "number" | "string";

export type FeatureKind = "plan" | "flag";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  valueType: FeatureValueType;
  /** "plan" → concedida pelo plano; "flag" → decidida só por flag operacional. */
  kind: FeatureKind;
}

export const FEATURE_CATALOG: readonly FeatureDefinition[] = [
  // ── Free ────────────────────────────────────────────────────────────────
  { key: "profile_basic", valueType: "boolean", kind: "plan", label: "Perfil empresarial básico", description: "Perfil público básico no directório." },
  { key: "profile_info", valueType: "boolean", kind: "plan", label: "Nome, logótipo, descrição, sector e localização", description: "Informação essencial do perfil, incluindo sector e localização." },
  { key: "products_services", valueType: "boolean", kind: "plan", label: "Produtos e serviços no perfil", description: "Registo e exposição de produtos/serviços." },
  { key: "contacts_basic", valueType: "boolean", kind: "plan", label: "Contactos comerciais básicos", description: "Contactos do perfil (telefone, email, morada)." },
  { key: "website_socials", valueType: "boolean", kind: "plan", label: "Website e redes sociais", description: "Ligações ao site e redes sociais." },
  { key: "search_discovery", valueType: "boolean", kind: "plan", label: "Pesquisa e descoberta no directório", description: "Ser encontrado na pesquisa e nas listagens do directório." },
  { key: "view_opportunities", valueType: "boolean", kind: "plan", label: "Visualização de oportunidades públicas", description: "Ver concursos e oportunidades públicos." },
  { key: "view_events", valueType: "boolean", kind: "plan", label: "Visualização de eventos públicos", description: "Explorar eventos e lançamentos públicos." },
  { key: "org_membership", valueType: "boolean", kind: "plan", label: "Associação a organizações e instituições", description: "Fazer parte de organizações e instituições." },
  { key: "receive_contacts", valueType: "boolean", kind: "plan", label: "Recepção de contactos e interesse", description: "Receber pedidos de contacto e manifestações de interesse." },
  { key: "respond_opportunities", valueType: "boolean", kind: "plan", label: "Resposta a oportunidades públicas", description: "Responder/olhar a oportunidades públicas." },
  { key: "negotiation_chat", valueType: "boolean", kind: "plan", label: "Negociação de propostas (chat)", description: "Chat de negociação por proposta com contra-ofertas." },
  // ── Workdeal Trust ──────────────────────────────────────────────────────
  { key: "verification_identity", valueType: "boolean", kind: "plan", label: "Verificação da identidade empresarial", description: "Validar a identidade legal da empresa." },
  { key: "verification_nuit", valueType: "boolean", kind: "plan", label: "Verificação do NUIT", description: "Validação do Número Único de Identificação Tributária." },
  { key: "verification_documents", valueType: "boolean", kind: "plan", label: "Verificação de registo e documentação", description: "Avaliação de documentos de registo." },
  { key: "verification_contacts", valueType: "boolean", kind: "plan", label: "Verificação de contactos", description: "Confirmação de contactos comerciais." },
  { key: "verification_location", valueType: "boolean", kind: "plan", label: "Verificação de localização e endereço", description: "Confirmação de localização/endereço." },
  { key: "verification_website", valueType: "boolean", kind: "plan", label: "Verificação do website", description: "Validação do site da empresa." },
  { key: "badge_trust", valueType: "boolean", kind: "plan", label: "Selo Workdeal Trust", description: "Exibe o selo de confiança no perfil." },
  { key: "trust_verified_state", valueType: "boolean", kind: "plan", label: "Estado de verificação visível no perfil", description: "Estado de verificação apresentado publicamente." },
  { key: "search_boost", valueType: "number", kind: "plan", label: "Maior destaque nos resultados de pesquisa", description: "Nível de destaque nos resultados de pesquisa (1–3)." },
  { key: "trust_opportunity_priority", valueType: "boolean", kind: "plan", label: "Prioridade em determinadas oportunidades", description: "Preferência em oportunidades que priorizam empresas verificadas." },
  { key: "trust_verification_history", valueType: "boolean", kind: "plan", label: "Histórico de verificação", description: "Registo do histórico de verificações." },
  // ── Premium ─────────────────────────────────────────────────────────────
  { key: "profile_advanced", valueType: "boolean", kind: "plan", label: "Perfil empresarial avançado", description: "Recursos avançados de personalização do perfil." },
  { key: "more_products_services", valueType: "boolean", kind: "plan", label: "Mais produtos e serviços", description: "Catálogo alargado de produtos e serviços." },
  { key: "multimedia_content", valueType: "boolean", kind: "plan", label: "Conteúdo multimédia no perfil", description: "Imagens, vídeo e galeria no perfil." },
  { key: "profile_stats", valueType: "boolean", kind: "plan", label: "Estatísticas do perfil", description: "Métricas de desempenho do perfil." },
  { key: "analytics_visits_contacts", valueType: "boolean", kind: "plan", label: "Analytics de visitas e contactos", description: "Relatórios de visitas e contactos recebidos." },
  { key: "analytics_opportunities", valueType: "boolean", kind: "plan", label: "Analytics de oportunidades", description: "Relatórios sobre oportunidades." },
  { key: "opportunity_alerts", valueType: "boolean", kind: "plan", label: "Alertas de novas oportunidades", description: "Notificações de oportunidades relevantes." },
  { key: "opportunity_matching", valueType: "boolean", kind: "plan", label: "Matching de oportunidades", description: "Correspondência automática de oportunidades." },
  { key: "partner_recommendations", valueType: "boolean", kind: "plan", label: "Recomendações de potenciais parceiros", description: "Sugestões de parcerias com base no perfil." },
  { key: "prospecting_tools", valueType: "boolean", kind: "plan", label: "Ferramentas de prospecção", description: "Ferramentas para prospecção comercial." },
  { key: "contact_management", valueType: "boolean", kind: "plan", label: "Gestão de contactos", description: "Organização e histórico dos contactos." },
  { key: "team_multi_user", valueType: "boolean", kind: "plan", label: "Equipa e multi-utilizador", description: "Vários membros a gerir a conta." },
  { key: "ai_assistant", valueType: "boolean", kind: "plan", label: "Assistente comercial (IA)", description: "Assistente com IA para apoio comercial." },
  { key: "ai_proposal_generation", valueType: "boolean", kind: "plan", label: "Geração de propostas (IA)", description: "Redacção assistida de propostas." },
  { key: "ai_response_support", valueType: "boolean", kind: "plan", label: "Apoio à preparação de respostas (IA)", description: "Apoio de IA na resposta a oportunidades." },
  { key: "ai_profile_assistant", valueType: "boolean", kind: "plan", label: "Assistente do perfil público (IA)", description: "Assistente de IA que conversa com visitantes do perfil público da empresa." },
  { key: "priority_support", valueType: "boolean", kind: "plan", label: "Suporte prioritário", description: "Atendimento prioritário." },
  // ── Enterprise ──────────────────────────────────────────────────────────
  { key: "multi_user_advanced", valueType: "boolean", kind: "plan", label: "Multi-utilizador avançado", description: "Gestão avançada de vários utilizadores." },
  { key: "team_management", valueType: "boolean", kind: "plan", label: "Gestão de equipas", description: "Gestão avançada de equipas e permissões." },
  { key: "role_permissions", valueType: "boolean", kind: "plan", label: "Permissões por função", description: "Controlo fino de permissões por função." },
  { key: "multiple_branches", valueType: "boolean", kind: "plan", label: "Múltiplas unidades e filiais", description: "Várias filiais sob a mesma conta." },
  { key: "procurement", valueType: "boolean", kind: "plan", label: "Procurement", description: "Workflow de compras e fornecimento." },
  { key: "opportunity_management_advanced", valueType: "boolean", kind: "plan", label: "Gestão avançada de oportunidades", description: "Gestão completa de oportunidades." },
  { key: "supplier_shortlists", valueType: "boolean", kind: "plan", label: "Shortlists de fornecedores", description: "Listas restritas de fornecedores." },
  { key: "proposal_evaluation", valueType: "boolean", kind: "plan", label: "Avaliação de propostas", description: "Avaliação estruturada de propostas." },
  { key: "internal_workflows", valueType: "boolean", kind: "plan", label: "Workflows internos", description: "Automação de processos internos." },
  { key: "supplier_history", valueType: "boolean", kind: "plan", label: "Histórico de fornecedores", description: "Histórico e desempenho de fornecedores." },
  { key: "analytics_advanced", valueType: "boolean", kind: "plan", label: "Analytics avançados", description: "Relatórios e dashboards avançados." },
  { key: "api_access", valueType: "boolean", kind: "plan", label: "API", description: "Acesso à API com quotas dedicadas." },
  { key: "integrations", valueType: "boolean", kind: "plan", label: "Integrações", description: "Ligações a ferramentas externas." },
  { key: "data_export", valueType: "boolean", kind: "plan", label: "Exportação de dados autorizados", description: "Exportação controlada de dados." },
  { key: "dedicated_agent", valueType: "boolean", kind: "plan", label: "Agente dedicado", description: "Agente comercial/dedicated de apoio." },
  { key: "matching_advanced", valueType: "boolean", kind: "plan", label: "Matching avançado", description: "Correspondência avançada de oportunidades." },
  { key: "priority_support_enterprise", valueType: "boolean", kind: "plan", label: "Suporte prioritário dedicado", description: "Suporte prioritário com resposta dedicada." },
  { key: "dedicated_onboarding", valueType: "boolean", kind: "plan", label: "Onboarding dedicado", description: "Arranque acompanhado pela equipa." },
];

export const FEATURE_BY_KEY: ReadonlyMap<FeatureKey, FeatureDefinition> = new Map(FEATURE_CATALOG.map((f) => [f.key, f]));

export const FEATURE_KEY_SET: ReadonlySet<FeatureKey> = new Set(FEATURE_KEYS);

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEY_SET as Set<string>).has(value);
}

export function featureLabel(key: string): string {
  return FEATURE_BY_KEY.get(key as FeatureKey)?.label ?? key;
}

export function featureDescription(key: string): string {
  return FEATURE_BY_KEY.get(key as FeatureKey)?.description ?? "";
}

// ── Resolução de features de um plano ──────────────────────────────────────
// Entrada esperada já com a ordem "do plano para a raiz da herança". O próprio
// plano tem prioridade: a primeira ocorrência de cada chave prevalece.

export interface FeatureEntry {
  featureKey: string;
  featureValue: string | null;
}

/** Constrói o mapa de features efectivas de um plano (herança resolvida). */
export function resolveFeatureMap(features: FeatureEntry[]): Map<FeatureKey, string> {
  const map = new Map<FeatureKey, string>();
  for (const f of features) {
    if (!map.has(f.featureKey as FeatureKey)) {
      map.set(f.featureKey as FeatureKey, f.featureValue ?? "true");
    }
  }
  return map;
}

export function hasFeature(map: ReadonlyMap<FeatureKey, string>, key: FeatureKey): boolean {
  return map.has(key);
}

/** Valor da feature (null se ausente) ou `fallback` quando falta. */
export function getFeatureValue(map: ReadonlyMap<FeatureKey, string>, key: FeatureKey, fallback: string | null = null): string | null {
  return map.get(key) ?? fallback;
}

/** Converte o valor textual armazenado para o tipo declarado da feature. */
export function parseFeatureValue(value: string | null | undefined, type: FeatureValueType): boolean | number | string | null {
  if (value == null) return null;
  if (type === "boolean") return value === "true" || value === "1";
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return value;
}

// ── Flags operacionais (activação/desactivação por âmbito) ────────────────
// O flag só pode REMOVER acesso: uma feature concedida pelo plano fica acessível
// se não houver flag OU se o flag estiver ligado para o âmbito.

export interface FlagDefinition {
  key: FeatureKey;
  defaultEnabled: boolean;
  emergencyDisabled: boolean;
}

export interface FlagOverride {
  flagKey: FeatureKey;
  organizationId: string;
  enabled: boolean;
  expiresAt: Date | null;
}

export function isOverrideActive(override: FlagOverride, now = Date.now()): boolean {
  return !override.expiresAt || override.expiresAt.getTime() > now;
}

/**
 * Estado final de um flag para um âmbito.
 * `emergencyDisabled` (kill-switch) vence tudo; depois a sobreposição da org;
 * por fim o default global. Sem flag definida → não bloqueia (`true`).
 */
export function resolveFlagEnabled(
  definition: FlagDefinition | undefined,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  now = Date.now(),
): boolean {
  if (!definition) return true;
  if (definition.emergencyDisabled) return false;
  if (organizationId) {
    const match = overrides.find(
      (o) => o.flagKey === definition.key && o.organizationId === organizationId,
    );
    if (match && isOverrideActive(match, now)) return match.enabled;
  }
  return definition.defaultEnabled;
}

/**
 * Uma feature está acessível para o âmbito quando o plano a concede E o flag
 * operacional (se existir) está ligado. Núcleo puro do gate — sem I/O.
 */
export function featureAccessible(
  planMap: ReadonlyMap<FeatureKey, string>,
  flagDefs: ReadonlyMap<FeatureKey, FlagDefinition>,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  key: FeatureKey,
  now?: number,
): boolean {
  return planMap.has(key) && resolveFlagEnabled(flagDefs.get(key), overrides, organizationId, now);
}

// ── Decisões tipadas (razões de acesso) ────────────────────────────────────
// Para sistemas enterprise, um gate não pode devolver só `boolean`: o
// middleware/Server Action precisa de saber PORQUE negou (sem subscrição,
// subscrição inactiva, plano não concede, flag desligado/kill-switch) para
// responder com detalhe útil ao cliente e para auditoria de integridade.

/** Estados de subscrição que concedem acesso a features pagas. */
export const FEATURE_SUBSCRIPTION_GRANTING_STATUSES = ["active", "past_due", "trialing"] as const;
export type FeatureSubscriptionGrantingStatus = (typeof FEATURE_SUBSCRIPTION_GRANTING_STATUSES)[number];

export function isSubscriptionGranting(status: string | null | undefined): boolean {
  return (FEATURE_SUBSCRIPTION_GRANTING_STATUSES as readonly string[]).includes(status ?? "");
}

/** Porque é que um flag bloqueia mesmo quando o plano concede a feature. */
export type FlagBlockReason = "kill_switch" | "default_disabled" | "org_override_disabled";

export function flagBlockLabel(reason: FlagBlockReason): string {
  switch (reason) {
    case "kill_switch":
      return "Kill-switch de emergência activo (desliga tudo)";
    case "default_disabled":
      return "Flag desligado por defeito na configuração global";
    case "org_override_disabled":
      return "Sobreposição desta organização desliga o flag";
  }
}

/**
 * Razão de bloqueio por flag para um âmbito, ou `null` se o flag não bloqueia
 * (sem flag definida, default ligado, override activo a ligar).
 */
export function resolveFlagBlockReason(
  definition: FlagDefinition | undefined,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  now = Date.now(),
): FlagBlockReason | null {
  if (!definition) return null;
  if (definition.emergencyDisabled) return "kill_switch";
  if (organizationId) {
    const match = overrides.find(
      (o) => o.flagKey === definition.key && o.organizationId === organizationId,
    );
    if (match && isOverrideActive(match, now)) return match.enabled ? null : "org_override_disabled";
  }
  if (!definition.defaultEnabled) return "default_disabled";
  return null;
}

/** Razão final de acesso de uma feature num âmbito. */
export type FeatureAccessReason =
  | "ok"
  | "no_subscription"
  | "subscription_inactive"
  | "plan_does_not_grant"
  | "flag_blocked";

export interface FeatureReasonResult {
  accessible: boolean;
  reason: FeatureAccessReason;
  /** Preenchido apenas quando `reason === "flag_blocked"`. */
  flagBlockReason?: FlagBlockReason;
}

/**
 * Núcleo puro da decisão. O contexto de subscrição (existe? fornece acesso?)
 * é calculado pela camada de dados — `features.ts` mantém-se sem I/O e sem
 * dependência de `entitlements.ts` (evita ciclo de imports).
 */
export function resolveFeatureReason(opts: {
  hasSubscription: boolean;
  subscriptionGranting: boolean;
  planGrants: boolean;
  flagBlockReason: FlagBlockReason | null;
}): FeatureReasonResult {
  if (!opts.hasSubscription) return { accessible: false, reason: "no_subscription" };
  if (!opts.subscriptionGranting) return { accessible: false, reason: "subscription_inactive" };
  if (!opts.planGrants) return { accessible: false, reason: "plan_does_not_grant" };
  if (opts.flagBlockReason) {
    return { accessible: false, reason: "flag_blocked", flagBlockReason: opts.flagBlockReason };
  }
  return { accessible: true, reason: "ok" };
}

export interface FeatureScopeStatus {
  hasSubscription: boolean;
  subscriptionGranting: boolean;
}

/** Resolve vários keys num só passo (eficiente — evita N resoluções). */
export function collectFeatureReasons(
  planMap: ReadonlyMap<FeatureKey, string>,
  flagDefs: ReadonlyMap<FeatureKey, FlagDefinition>,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  keys: readonly FeatureKey[],
  scopeStatus: FeatureScopeStatus,
  now?: number,
): Map<FeatureKey, FeatureReasonResult> {
  const out = new Map<FeatureKey, FeatureReasonResult>();
  for (const key of keys) {
    out.set(
      key,
      resolveFeatureReason({
        hasSubscription: scopeStatus.hasSubscription,
        subscriptionGranting: scopeStatus.subscriptionGranting,
        planGrants: planMap.has(key),
        flagBlockReason: resolveFlagBlockReason(flagDefs.get(key), overrides, organizationId, now),
      }),
    );
  }
  return out;
}

/** Keys pedidos que estão efectivamente bloqueados + razões por key. */
export function missingFeatureKeys(
  planMap: ReadonlyMap<FeatureKey, string>,
  flagDefs: ReadonlyMap<FeatureKey, FlagDefinition>,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  keys: readonly FeatureKey[],
  scopeStatus: FeatureScopeStatus,
  now?: number,
): { missing: FeatureKey[]; reasons: Map<FeatureKey, FeatureReasonResult> } {
  const reasons = collectFeatureReasons(planMap, flagDefs, overrides, organizationId, keys, scopeStatus, now);
  const missing = keys.filter((k) => !reasons.get(k)!.accessible);
  return { missing, reasons };
}

/**
 * Explica porque é que uma feature está/estaria bloqueada num âmbito.
 * Usado pela auditoria de integridade e pelos detalhes do AppError.
 */
export function explainFlagBlock(
  definition: FlagDefinition | undefined,
  overrides: readonly FlagOverride[],
  organizationId: string | null,
  key: FeatureKey,
  now?: number,
): {
  flagExists: boolean;
  blockReason: FlagBlockReason | null;
  blockLabel: string | null;
} {
  const blockReason = resolveFlagBlockReason(definition, overrides, organizationId, now);
  return {
    flagExists: !!definition,
    blockReason,
    blockLabel: blockReason ? flagBlockLabel(blockReason) : null,
  };
}