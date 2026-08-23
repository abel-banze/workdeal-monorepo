# Plano: Seed de Categorias + Onboarding Empresa Completo (Qualificação MPME vs Grande)

## Goal
Tornar o portal Workdeal profissional e não-amador: (1) seed completo de **áreas de actuação / categorias** para o directório, e (2) onboarding de **empresa** que recolha o máximo de dados necessários para qualificar a empresa quanto a porte/dimensão (MPME vs grande empresa, à la IPEME Moçambique) e adequar exigências, visibilidade, selos e elegibilidade a concursos/tarefas.

## Success Criteria
- `pnpm --filter @workdeal/db db:seed` popula categorias hierárquicas usáveis (≥ 8 domínios, ≥ 35 categorias, slugs únicos, parentId, isActive, sem duplicar nas re-execuções via `onConflictDoNothing`).
- Onboarding empresa distingue `individual` vs `company` já em `apps/web/app/(onboarding)/onboarding/page.tsx:36` e, se `organizationId` presente, executa wizard estendido que recolhe dados de porte e qualificação, valida com Zod em `packages/shared`, persiste via `apiFetchWithAuth` e permite classificação determinística (micro 1-4, pequena 5-49, média 50-100, grande >100 trabalhadores; fallback por volume de negócios anual MZN).
- Dados de qualificação persistem sem quebrar perfis existentes (migração aditiva, defaults, compatível com `profile` individual).
- Portal exibe porte classificado, selos e filtros por porte/categoria no directório — aspecto completo/profissional.

## Context And Current Facts
- **Seed actual** em [packages/db/src/seed.ts:4](packages/db/src/seed.ts:4): 15 categorias (construção + 3 filhas, eventos + catering, TI + dev, contabilidade, marketing, transporte, saúde, educação, jurídico, limpeza). Sem taxonomia CNAE-like, sem cobertura de áreas críticas Moçambique (energia, água, agronegócio, indústria, segurança, manutenção AVAC, serralharia, pintura, etc). `category.slug` único, `parentId` nullable, `seed()` idempotente.
- **Schema actual**: [packages/db/src/schema.ts:181](packages/db/src/schema.ts:181) `category` sem nível/tipo; [packages/db/src/schema.ts:204](packages/db/src/schema.ts:204) `profile` tem contactos, `businessHours jsonb`, `latitude/longitude`, mas nenhum campo de porte empresarial (nº trabalhadores, volume negócios, NUIT, alvará, ano fundação, capital social, forma jurídica). [packages/db/src/schema.ts:97](packages/db/src/schema.ts:97) `organization` só tem `name/slug/logo/metadata/verificationStatus`.
- **Shared schemas**: [packages/shared/src/schemas/profile.ts:29](packages/shared/src/schemas/profile.ts:29) `createProfileSchema` só `name/slug/organizationId/categoryIds` + `contactFieldsSchema` (url, whatsapp, etc). Sem `companyQualification`.
- **Onboarding actual**: [apps/web/app/(onboarding)/onboarding/page.tsx:6](apps/web/app/(onboarding)/onboarding/page.tsx:6) 3 passos (nome, categoria única dentre 12, whatsapp) + passo 4 verificação opcional em [apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:28](apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:28) via `Questionnaire`. Detecta `organizationId` via `authClient.organization.list()` mas não recolhe dados de empresa. Individual e empresa partilham o mesmo wizard mínimo — insuficiente para qualificação.
- **Infra**: Drizzle + Postgres, better-auth `organization` plugin, SSR-first Next.js, validação Zod única em `packages/shared`. `drizzle.config.ts` aponta `DATABASE_URL` de `../../.env`.
- **Requisito utilizador**: em PT-MZ, portal completo, não parecer amador; empresa precisa fornecer dados máximos para classificação MPME vs grande, e exigências do Workdeal adequarem-se ao porte.

## Constraints And Non-goals
- **Constraints**: manter `onboarding` individual leve (evitar tédio, como pedido anterior — só empresa pede wizard estendido); manter SSR-first (`page.tsx` Server Component, `Questionnaire` é client leaf); validação única Zod em `packages/shared`; não duplicar lógica de negócio entre `web` e `api`; `category` sem breaking change (manter `id/slug`); `better-auth` não estendido sem necessidade; env via `DATABASE_URL`/`BETTER_AUTH_URL`.
- **Non-goals** (não neste plano): sistema de pagamento/subscrição por porte; workflow completo de verificação documental com upload S3; migração de dados históricos; integração com API externa IPEME/AT; selos automáticos por porte (só classificação).

## Key Decisions
| Tema | Opção A (recomendada) | Opção B rejeitada | Motivo |
|---|---|---|---|
| **Taxonomia categorias** | 8-10 domínios L1 + 35-50 L2/L3 inspirado CNAE + realidade MZ (Construção, Energia/Água, Indústria/Manufatura, Agronegócio, Transporte/Logística, TI/Telecom, Serviços Empresariais, Saúde/Bem-estar, Educação, Marketing/Design/Eventos) com slugs `kebab-case` estáveis | Copiar CNAE integral (300+ códigos) | Excesso torna seed/filtros amadores; 35-50 cobre 95% casos e é navegável |
| **Modelo de porte** | Campos estruturados em nova tabela `company_qualification` (ou `organization.metadata` se preferir evitar migração) + enum `company_size` : `micro/pequena/media/grande`; classificação derivada por `nº trabalhadores` (primário) + `volumeNegociosAnualMz` (secundário) conforme IPEME 1-4/5-49/50-100/>100 | Só `profile.description` texto livre | Impossível filtrar/adaptar exigências deterministicamente |
| **Onde persistir** | Nova tabela `company_profile` ou `company_qualification` FK `organizationId` 1:1 + `profileId` opcional, com `jsonb` `licenses` + timestamps | Estender `profile` com 12 colunas nullable | `profile` serve indivíduo e empresa; polui individuais; tabela dedicada é limpa e evolui sem migrações pesadas no `profile` |
| **Wizard empresa** | Bifurcação: `if organizationId` → 6-7 passos (vs 3 indivíduo): 1 identificação, 2 porte (trabalhadores + volume negócios + ano fundação + forma jurídica), 3 áreas (1-3 categorias), 4 contactos & localização (incl. distrito/província), 5 capacidades (licenças/alvará, certificações, portfólio link), 6 declaração → criar perfil; progressivo, cada passo validável, `Skip` só na verificação | Wizard único 7 passos para todos | Empresa ficaria sub-qualificada ou indivíduo sobrecarregado |
| **Validação** | `companyQualificationSchema` em `packages/shared/src/schemas/company.ts` (Zod) usado em `apps/web/app/actions/profiles.ts:createProfile` e `apps/api/src/routes/profiles.route.ts:zValidator` | Validação só client | Viola regra 3.2 validar sempre no backend |
| **Seed** | Reescrever `packages/db/src/seed.ts` para 40-45 categorias hierárquicas (id determinístico `cat-*`, parentId, description PT-MZ, isActive), preservar ids antigos para não quebrar FKs, `onConflictDoNothing` por `id` e `slug` | Gerar via SQL `INSERT` manual | Perde idempotência e tipagem Drizzle |

## Recommended Approach
1. **Desenhar taxonomia final** (40 categorias) baseada nos 8 domínios acima, mapeando `slug` existentes (`construcao`, `electrica`, `canalizacao`, `carpintaria`, `catering`, etc) como L2 para retrocompatibilidade; novas L1/L2 cobrem energia solar, frio/AVAC, serralharia/soldadura, pintura, segurança, limpeza industrial, contabilidade/fiscalidade, jurídico, RH, agronegócio, etc. Cada categoria com `name` PT-MZ e `description` 1 linha (útil para SEO/`generateMetadata`).
2. **Definir thresholds MPME Moçambique** no código partilhado: `micro: 1-4`, `pequena: 5-49`, `media: 50-100`, `grande: >100` trabalhadores; `volumeNegocios` faixas: micro ≤1.2M MZN, pequena ≤14.7M, média ≤30M (valores IPEME aproximados, configuráveis em `packages/shared/src/lib/company-size.ts` com helper `classifyCompanySize({workers, turnover})`). Resultado usado para badge e para regras de exigência (ex: micro não precisa alvará classe 5).
3. **Schema + migração**: criar `company_qualification` (`id PK, organizationId FK unique, profileId FK nullable unique, companySize enum, workers integer, turnoverMz integer nullable, foundedYear integer nullable, legalForm enum (lda/su/unipessoal/cooperativa), nuit text nullable, alvara text nullable, licenses jsonb, createdAt/updatedAt`). `drizzle-kit generate` → `0007_company_qualification.sql` + atualizar `packages/db/src/schema.ts` + `drizzle/meta`.
4. **Schemas Zod partilhados**: `packages/shared/src/schemas/company.ts` com `companyQualificationSchema` + `createCompanyProfileSchema = createProfileSchema.extend({ qualification: companyQualificationSchema.optional() })`; exportar em `packages/shared/src/index.ts`.
5. **Backend**: `apps/api/src/services/profiles.service.ts` passa a calcular `companySize` via helper e persistir qualificação transaccionalmente; `apps/api/src/repositories/profiles.repository.ts` novo método; `apps/api/src/routes/profiles.route.ts` valida com `zValidator`; `GET /api/v1/categories` já existente serve novo seed sem mudança.
6. **Frontend — bifurcação onboarding**: `apps/web/app/(onboarding)/onboarding/page.tsx` mantém Server Component e `getServerSession` + `getCategories` (agora 40). `onboarding-form.tsx` com `organizationId ? <CompanyOnboardingWizard> : <IndividualOnboardingWizard>` ambos usando `Questionnaire` shadcn. Empresa recolhe em 6 passos os campos acima, com `QuestionnairePrevious/Next` + validação incremental; usa `createProfile` + `createCompanyQualification` (ou payload único). `QuestionnaireChoice` para `legalForm` e `workers` faixas. Para não parecer amador: cards com ícones, `QuestionnaireProgress`, `loading.tsx/error.tsx` já existentes, e `businessHours` opcional.
7. **Seed profissional**: atualizar `packages/db/src/seed.ts` com nova lista; `pnpm db:seed` idempotente; `drizzle/seed` documenta porte esperado.
8. **Exibição**: `apps/web/app/(directory)/profiles/[slug]/page.tsx` e `components/features/BadgeList` exibem porte e selo `MPME`/`Grande` quando disponível.

## Work Plan
| # | Unidade | Superfície / Ficheiros | Dependência | Dono |
|---|---|---|---|---|
| 1 | Taxonomia + helpers porte | `packages/shared/src/lib/company-size.ts`, `packages/db/src/seed.ts` (nova lista 40 categorias), `packages/db/drizzle/0007_*` | — | shared/db |
| 2 | Schema + migração qualificação | `packages/db/src/schema.ts` (nova tabela + enums), `packages/shared/src/schemas/company.ts` | 1 | db/shared |
| 3 | API — serviço/repo de qualificação | `apps/api/src/services/profiles.service.ts`, `repositories/profiles.repository.ts`, `routes/profiles.route.ts`, `lib/company-size.ts` | 2 | api |
| 4 | Onboarding empresa (wizard estendido) | `apps/web/app/(onboarding)/onboarding/page.tsx`, `onboarding-form.tsx` (split Individual vs Company, 6 passos, `Questionnaire*`), `app/actions/profiles.ts` (novo `createCompanyQualification`) | 2,3 | web |
| 5 | Directório & perfil — exibição porte | `apps/web/app/(directory)/...`, `components/features/BadgeList.tsx` | 2 | web |
| 6 | Validação & docs | `docs/adr/00x-company-qualification.md`, manual test `onboarding` empresa/individual + `pnpm db:seed` | 1-5 | docs |

Ordem: 1 → 2 → 3 → 4 → 5 → 6. Unidades 1-3 podem ser num PR, 4-5 noutro se o review exigir.

## Validation Plan
- `pnpm --filter @workdeal/db db:generate` (gera migraçãoSem diff extra) + `pnpm --filter @workdeal/db db:migrate` contra `workdeeal_monorepo` local, depois `pnpm --filter @workdeal/db db:seed` 2x (idempotência — segunda não duplica) + `SELECT count(*) FROM category WHERE is_active` deve dar ≥35 e `SELECT slug FROM category WHERE slug='electrica'` ainda existe.
- `npx tsc --noEmit` em `packages/shared`, `packages/db`, `apps/api`, `apps/web` — sem erros nos novos Schemas/enums.
- Manual E2E 1: `signup` empresa (cria org) → `/onboarding` exibe wizard 6 passos → preencher porte 3 trabalhadores + turnover 800k → classificado `micro` → `GET /api/v1/profiles/me` devolve `qualification.companySize='micro'`.
- Manual E2E 2: `signup` individual → wizard 3 passos curto permanece igual (não pede NUIT/alvará).
- Headless: `Invoke-WebRequest /api/v1/categories` volta 40 categorias; `POST /api/v1/profiles` sem `qualification` para empresa falha `400` Zod; com `qualification` passa `201`.
- Visual: `/directorio?categoria=construcao&porte=micro` filtra; `/perfis/[slug]` mostra selo porte sem quebrar layout existente.

**Passo de maior risco:** migração + classificação MPME vs grande (unidade 2) — se thresholds errados, toda a qualificação e regras de exigência ficam enviesadas. Validar com tabela IPEME oficial antes de `db:migrate` em prod.

## Risks / Rollback
- **Risco**: taxonomia nova quebra bookmarks com `categorySlug` antigo → mitigado preservando slugs existentes (`electrica`, `canalizacao`, etc) como alias/L2 e adicionando redirect 301 se necessário.
- **Risco**: `company_qualification` orfão se `organization` apagada → FK `onDelete cascade`.
- **Rollback**: migração é aditiva e nova tabela; `drizzle-kit` down via `DROP TABLE company_qualification` + reverter `seed.ts` para lista anterior (git). Sem impacto em `profile` individual.
- **Compatibilidade**: `profile` sem qualificação continua `draft/active` normal; API devolve `qualification: null` para compat.

## Open Questions
- **Nenhuma** que impeça implementação: thresholds exactos IPEME (usar 1-4/5-49/50-100/>100 e turnover 1.2M/14.7M/30M como default configurável) — confirmar com equipa legal se devem ser editáveis via admin ou hardcoded.
- Forma jurídica completa para MZ: LDA, SU, Cooperativa, Empresa em Nome Individual — confirmar lista fechada vs `outro`.
- NUIT obrigatório para empresa? Recomendado `nullable` no MVP para não bloquear onboarding, mas selo `Verificado` só após NUIT validado (já existe `badge-verificado`).
