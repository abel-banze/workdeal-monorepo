import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { plan, planFeature } from "./schema.js";

// Planos Workdeal — hipóteses de produto (ver doc "Planos e Features").
// Preços, limites e algumas features comerciais são hipóteses a validar no mercado.
// Herança: Enterprise ⊃ Premium ⊃ Trust ⊃ Free — cada plano persiste só as features
// próprias; a união é resolvida por `inheritFromPlanId` no query time.

const PLAN_FEATURE_LABELS: Readonly<Record<string, string>> = {
  // Free
  profile_basic: "Perfil empresarial básico",
  profile_info: "Nome, logótipo, descrição, sector e localização",
  products_services: "Produtos e serviços no perfil",
  contacts_basic: "Contactos comerciais básicos",
  website_socials: "Website e redes sociais",
  search_discovery: "Pesquisa e descoberta no directório",
  view_opportunities: "Visualização de oportunidades públicas",
  view_events: "Visualização de eventos públicos",
  org_membership: "Associação a organizações e instituições",
  receive_contacts: "Recepção de contactos e interesse",
  respond_opportunities: "Resposta a oportunidades públicas",
  // Workdeal Trust
  verification_identity: "Verificação da identidade empresarial",
  verification_nuit: "Verificação do NUIT",
  verification_documents: "Verificação de registo e documentação",
  verification_contacts: "Verificação de contactos",
  verification_location: "Verificação de localização e endereço",
  verification_website: "Verificação do website",
  badge_trust: "Selo Workdeal Trust",
  trust_verified_state: "Estado de verificação visível no perfil",
  search_boost: "Maior destaque nos resultados de pesquisa",
  trust_opportunity_priority: "Prioridade em determinadas oportunidades",
  trust_verification_history: "Histórico de verificação",
  // Premium
  profile_advanced: "Perfil empresarial avançado",
  more_products_services: "Mais produtos e serviços",
  multimedia_content: "Conteúdo multimédia no perfil",
  profile_stats: "Estatísticas do perfil",
  analytics_visits_contacts: "Analytics de visitas e contactos",
  analytics_opportunities: "Analytics de oportunidades",
  opportunity_alerts: "Alertas de novas oportunidades",
  opportunity_matching: "Matching de oportunidades",
  partner_recommendations: "Recomendações de potenciais parceiros",
  prospecting_tools: "Ferramentas de prospecção",
  contact_management: "Gestão de contactos",
  team_multi_user: "Equipa e multi-utilizador",
  ai_assistant: "Assistente comercial (IA)",
  ai_proposal_generation: "Geração de propostas (IA)",
  ai_response_support: "Apoio à preparação de respostas (IA)",
  priority_support: "Suporte prioritário",
  // Enterprise
  multi_user_advanced: "Multi-utilizador avançado",
  team_management: "Gestão de equipas",
  role_permissions: "Permissões por função",
  multiple_branches: "Múltiplas unidades e filiais",
  procurement: "Procurement",
  opportunity_management_advanced: "Gestão avançada de oportunidades",
  supplier_shortlists: "Shortlists de fornecedores",
  proposal_evaluation: "Avaliação de propostas",
  internal_workflows: "Workflows internos",
  supplier_history: "Histórico de fornecedores",
  analytics_advanced: "Analytics avançados",
  api_access: "API",
  integrations: "Integrações",
  data_export: "Exportação de dados autorizados",
  dedicated_agent: "Agente comercial e de procurement dedicado",
  matching_advanced: "Matching avançado",
  priority_support_enterprise: "Suporte prioritário dedicado",
  dedicated_onboarding: "Onboarding dedicado",
};

type PlanSeed = {
  id: string;
  slug: string;
  name: string;
  description: string;
  inheritFromPlanId?: string;
  priceMzn: number;
  trialDays: number;
  maxProfiles: number | null;
  maxTeamMembers: number | null;
  maxListings: number | null;
  maxBranches: number | null;
  apiAccess: boolean;
  maxApiCallsPerMonth: number | null;
  sortOrder: number;
  metadata?: Record<string, unknown>;
  features: Array<[key: string, value?: string]>;
};

// Valores definidos de forma central — qualquer ajuste comercial é feito aqui.
export const TRUST_PRICING_TEST_MZN = [3500, 10000, 18000] as const;

export const PLANS_SEED: PlanSeed[] = [
  {
    id: "plan-free",
    slug: "free",
    name: "Free",
    description: "Entrada no ecossistema — perfil, pesquisa e acesso ao mercado.",
    priceMzn: 0,
    trialDays: 0,
    maxProfiles: 1,
    maxTeamMembers: 1,
    maxListings: 5,
    maxBranches: 1,
    apiAccess: false,
    maxApiCallsPerMonth: null,
    sortOrder: 0,
    features: [
      ["profile_basic"],
      ["profile_info"],
      ["products_services"],
      ["contacts_basic"],
      ["website_socials"],
      ["search_discovery"],
      ["view_opportunities"],
      ["view_events"],
      ["org_membership"],
      ["receive_contacts"],
      ["respond_opportunities"],
    ],
  },
  {
    id: "plan-trust",
    slug: "trust",
    name: "Workdeal Trust",
    description: "Camada de confiança — verificação da identidade e legitimidade da empresa.",
    inheritFromPlanId: "plan-free",
    priceMzn: TRUST_PRICING_TEST_MZN[0],
    trialDays: 7,
    maxProfiles: 1,
    maxTeamMembers: 1,
    maxListings: 10,
    maxBranches: 1,
    apiAccess: false,
    maxApiCallsPerMonth: null,
    sortOrder: 1,
    metadata: { currency: "MZN", pricingTest: TRUST_PRICING_TEST_MZN },
    features: [
      ["verification_identity"],
      ["verification_nuit"],
      ["verification_documents"],
      ["verification_contacts"],
      ["verification_location"],
      ["verification_website"],
      ["badge_trust"],
      ["trust_verified_state"],
      ["search_boost", "1"],
      ["trust_opportunity_priority"],
      ["trust_verification_history"],
    ],
  },
  {
    id: "plan-premium",
    slug: "premium",
    name: "Premium",
    description: "Crescimento e produtividade — visibilidade, analytics, IA e equipa.",
    inheritFromPlanId: "plan-trust",
    priceMzn: 10000,
    trialDays: 7,
    maxProfiles: 5,
    maxTeamMembers: 5,
    maxListings: 50,
    maxBranches: 5,
    apiAccess: false,
    maxApiCallsPerMonth: null,
    sortOrder: 2,
    metadata: { currency: "MZN" },
    features: [
      ["profile_advanced"],
      ["more_products_services"],
      ["multimedia_content"],
      ["profile_stats"],
      ["analytics_visits_contacts"],
      ["analytics_opportunities"],
      ["opportunity_alerts"],
      ["opportunity_matching"],
      ["partner_recommendations"],
      ["prospecting_tools"],
      ["contact_management"],
      ["team_multi_user"],
      ["ai_assistant"],
      ["ai_proposal_generation"],
      ["ai_response_support"],
      ["priority_support"],
      ["search_boost", "2"],
    ],
  },
  {
    id: "plan-enterprise",
    slug: "enterprise",
    name: "Enterprise",
    description: "Procurement, inteligência empresarial, automação e API.",
    inheritFromPlanId: "plan-premium",
    priceMzn: 35000,
    trialDays: 14,
    maxProfiles: null,
    maxTeamMembers: null,
    maxListings: null,
    maxBranches: null,
    apiAccess: true,
    maxApiCallsPerMonth: 100000,
    sortOrder: 3,
    metadata: { currency: "MZN" },
    features: [
      ["multi_user_advanced"],
      ["team_management"],
      ["role_permissions"],
      ["multiple_branches"],
      ["procurement"],
      ["opportunity_management_advanced"],
      ["supplier_shortlists"],
      ["proposal_evaluation"],
      ["internal_workflows"],
      ["supplier_history"],
      ["analytics_advanced"],
      ["api_access"],
      ["integrations"],
      ["data_export"],
      ["dedicated_agent"],
      ["matching_advanced"],
      ["priority_support_enterprise"],
      ["dedicated_onboarding"],
      ["search_boost", "3"],
    ],
  },
];

export async function seedPlans(): Promise<{ plans: number; features: number }> {
  let featureCount = 0;

  await db.transaction(async (tx) => {
    for (const p of PLANS_SEED) {
      const { id, slug, features, inheritFromPlanId, ...rest } = p;
      await tx
        .insert(plan)
        .values({
          id,
          slug,
          inheritFromPlanId: inheritFromPlanId ?? null,
          ...rest,
        })
        .onConflictDoUpdate({
          target: plan.slug,
          set: {
            name: p.name,
            description: p.description,
            priceMzn: p.priceMzn,
            trialDays: p.trialDays,
            maxProfiles: p.maxProfiles,
            maxTeamMembers: p.maxTeamMembers,
            maxListings: p.maxListings,
            maxBranches: p.maxBranches,
            apiAccess: p.apiAccess,
            maxApiCallsPerMonth: p.maxApiCallsPerMonth,
            sortOrder: p.sortOrder,
            metadata: p.metadata ?? null,
            updatedAt: new Date(),
          },
        });

      await tx.delete(planFeature).where(eq(planFeature.planId, id));
      if (features.length > 0) {
        await tx
          .insert(planFeature)
          .values(
            features.map(([key, value]) => ({
              planId: id,
              featureKey: key,
              featureValue: value ?? "true",
              label: PLAN_FEATURE_LABELS[key] ?? null,
            })),
          )
          .onConflictDoNothing();
        featureCount += features.length;
      }
    }
  });

  console.log(`  ${PLANS_SEED.length} plans seeded`);
  console.log(`  ${featureCount} plan features seeded`);
  return { plans: PLANS_SEED.length, features: featureCount };
}

// @ts-ignore - Biunism, tsc nodenext não tem `main` em ImportMeta
if ((import.meta as unknown as { main?: boolean }).main) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}