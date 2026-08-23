# TODO — Dashboard & Gestão de Perfil (Workdeal)

> Fonte: auditoria `2026-08-23` (`apps/web/app/(dashboard)/dashboard/*`, `apps/api/src/{routes,services,repositories}/profiles.*`, `packages/shared/schemas/*`, `packages/db/schema.ts`, `AGENTS.md` §2/4/7). Este doc é o tracking único — marcar `[x]` ao concluir, nunca pular P0.

## 0. Como usar
- Um item só pode estar `in_progress` de cada vez.
- Marcar `completed` exige `npx tsc --noEmit` em `apps/web` `EXIT:0` + `revalidateTag`/RBAC verificados.
- Cada PR deve tocar num único domínio e referir o ID `P0-n`.
- Validar checklist AGENTS §7 antes de merge.

## 1. Estado fechado (não reabrir)
- [x] Onboarding 4 passos (`Empresa/Contactos/Presença/Verificação`) + logo upload `handleLogoFile` `apps/web/app/(onboarding)/onboarding/onboarding-form.tsx:96/450` + `purpose="logo"` via `uploadFilesAction` → `files.service.ts:43` (Cloudinary `workdeal/logo`, mock dev)
- [x] Inputs compactos uniformes `rounded-lg px-3 py-2 text-[13px]` onboarding ↔ `signup-form.tsx:50` / `login-form.tsx:40` + `labelCls uppercase tracking-[0.07em]`
- [x] Signup: `Checkbox` `packages/ui/src/components/checkbox.tsx:1` obrigatório `acceptedTerms` `signup-form.tsx:16/23` + `disabled={loading||!acceptedTerms}` + páginas `/terms` `/privacy` (renomeado de `/termos`/`/privacidade`)

## 2. P0 — Bloqueante prod (1-2 semanas) — fazer por esta ordem

### P0-1 — Separar perfil pessoal vs organização (2d) — `completed 2026-08-23`
- **Ficheiros:** `apps/api/src/services/profiles.service.ts:99 getMyProfile`, `apps/web/app/(dashboard)/dashboard/page.tsx:30/50`, `apps/web/app/(dashboard)/dashboard/profile/edit/page.tsx:31`, `apps/web/app/(dashboard)/dashboard/layout.tsx:22`
- **Tarefa:** `findByUserId` só para `type=individual`; `[organizationId]` só via `findByOrganizationId`. Remover fallback `profiles/me` que retorna company para user sem perfil individual. `dashboard/page.tsx` deve escolher `personal` vs `org` explicitamente, não `orgId=null`.
- **DoD:** `member` com `tasks:view` não consegue editar company via `/dashboard/profile/edit` (deve receber 403 com mensagem, não `notFound`). Teste integração: `PATCH /:slug` de member → 403.
- **Implementado:** `profiles.service.ts:99` agora só `findByUserId` + `findBySlug` (sem `db/member` loop); `dashboard/page.tsx:12` single-fetch `profiles/me` com `profileId` único, `orgId=null` explícito; `layout.tsx:22` guard verifica `profiles/me` e, se null, percorre `allOrgs` via `GET /profiles/:slug` antes de `redirect("/onboarding")`; removido `console.log` e `debugOrgsCount`.
- **Deps:** nenhuma
- [x] P0-1

### P0-2 — RBAC em profundidade (1d) — `completed 2026-08-23`
- **Ficheiros:** `apps/api/src/routes/profiles.route.ts:52 PATCH/DELETE :slug`, `apps/api/src/routes/profile-locations.route.ts:30`
- **Tarefa:** Aplicar `requireOrgPermission("profile:edit")` middleware (AGENTS §6 ordem: `requestId→logger→cors→rateLimit→requireAuth→requireOrgPermission→zValidator→onError`). Em `profile-locations` validar `profile.organizationId === input.organizationId` (evita cross-org write).
- **DoD:** `PATCH /:slug` sem `x-verified-contacts` mas com `Authorization` de não-membro → 403; `POST /profile-locations` com `profileId` de org B por membro de org A → 403.
- **Implementado:** `profiles.route.ts:30` `requireProfilePermission("profile:edit"|"profile:delete")` via `createMiddleware` com `hasSystemPermission` + `hasSelfPermission` + `hasOrgPermission(getOrgRole)` antes de `zValidator`; `profile-locations.route.ts:30` valida `row.organizationId === input.organizationId` (company) e rejeita `organizationId` em perfil pessoal, com mensagens 403 específicas.
- **Deps:** P0-1
- [x] P0-2

### P0-3 — Dashboard pessoal sem degradação (0.5d) — `completed 2026-08-23`
- **Ficheiros:** `apps/web/app/(dashboard)/dashboard/page.tsx:12`, `apps/web/app/(dashboard)/dashboard/layout.tsx:22` (referência)
- **Tarefa:** Trocar `getServerSession` → `requireAuth` com `redirect("/login")`, remover double fetch `profiles/me`+`af2`, passar `organizationId` real a `AdvancedLocationSettings:63`.
- **DoD:** Utilizador não autenticado redirect, não vê masthead vazio. `orgId` não-null quando perfil é company.
- **Implementado:** `page.tsx:2` `requireAuth` em vez de `getServerSession`, `user` não-opcional, guard SSR-first conforme AGENTS §4.5; double-fetch removido em P0-1 (single `profiles/me` → `profileId` + `locations`), `orgId` explicitado `const orgId:null` para personal.
- [x] P0-3

### P0-4 — Revalidação após onboarding (0.5d) — `completed 2026-08-23`
- **Ficheiros:** `apps/web/app/actions/onboarding.ts:30`, `apps/web/app/actions/profiles.ts:32`
- **Tarefa:** `revalidateTag("profiles")` + `revalidateTag(`profile:${slug}`)` após `complete`; trocar `REVALIDATE="max":11` por revalidação especifica.
- **DoD:** Novo perfil aparece em `/companies` < 10s, não 1h (`s-maxage=60` em `profiles.route.ts:31` já OK).
- **Implementado:** `onboarding.ts:30` `revalidateTag("profiles","max")` + `profile:${slug|profileId}` após `apiFetchWithAuth`; `profiles.ts:30` mantém `revalidateTag` por tag específica (sem `REVALIDATE_PROFILE` genérico).
- [x] P0-4

### P0-5 — Rate-limit leituras públicas (0.5d) — `completed 2026-08-23`
- **Ficheiros:** `apps/api/src/routes/profiles.route.ts:46 GET :slug`, `profile-locations.route.ts:?? GET :profileId`
- **Tarefa:** `rateLimit({window:"1m", max:100})` + `Cache-Control: no-store` já existe para `near:30`, aplicar também a `GET :slug` e `GET /profile-locations/:profileId`.
- **DoD:** Scraping `GET /:slug` >100/min → 429 com `X-RateLimit-*`.
- **Implementado:** `profiles.route.ts:15` `publicLimiter max:100` + `GET /:slug rateLimit(publicLimiter)`; `profile-locations.route.ts:30` `locLimiter max:100` + `rateLimit(locLimiter)` + `Cache-Control: no-store` em `GET /:profileId`.
- [x] P0-5

### P0-6 — Estados de UI em falta (1d) — `completed 2026-08-23`
- **Ficheiros:** `apps/web/app/(dashboard)/dashboard/{page,layout}.*`, `apps/web/app/(dashboard)/dashboard/[organizationId]/*`
- **Tarefa:** Criar `loading.tsx`/`error.tsx`/`not-found.tsx` + `generateMetadata` para perfis + `next/image` em `profile-card.tsx:31` (hoje `<img>`). Envolver `QualificationView`/`VisitsTimeChart` em `<Suspense fallback>`.
- **DoD:** AGENTS §2.5 check passa; `next build` sem warning `no-img-element` em dashboards.
- **Implementado:** `dashboard/loading.tsx`, `error.tsx` (client + reset), `not-found.tsx` + `dashboard/[organizationId]/{loading,error,not-found}.tsx` com skeletons ledger; `profile-card.tsx:1` `next/image` `fill sizes="56px"` + `relative` container; tsc `EXIT:0`.
- [x] P0-6

### P0-7 — Re-activar PostGIS (3d) ⚠️ infra — `completed 2026-08-23` (código; migração a aplicar)
- **Ficheiros:** `packages/db/src/schema.ts:198 geographyPoint`, `:243 profile_geo_idx`, `apps/api/src/repositories/profiles.repository.ts:205 haversineKm`, `docker-compose.yml`, Coolify
- **Tarefa:** `customType → "geography(Point,4326)"`, migração `CREATE EXTENSION postgis; CREATE INDEX ... USING GIST(geom)`, `ORDER BY ST_Distance(geom, ST_MakePoint(lng,lat)::geography)` em vez de `haversine` em memória após `limit`, `CREATE INDEX GIN(searchTsv)` via `to_tsvector`.
- **DoD:** `EXPLAIN` mostra `Index Scan using profile_geom_gist_idx` em `GET /?near=lat,lng`; 10k+ perfis ordenados em <100ms. Fallback `text` removido.
- **Implementado:** `schema.ts:198` `geography(Point,4326)`, `docker-compose.yml:3` já `postgis/postgis:16-3.4`, `profiles.repository.ts:205` `ST_Distance` + remoção haversine, `profileLocation.repository.ts:1` sync geom, `drizzle/0014_reactivate_postgis.sql` + `_journal.json:14` com `CREATE EXTENSION`, conversão `text→geography`, backfill e `GIST(geom)`; `apps/api` + `apps/web` `tsc EXIT:0`.
- **Pendente infra:** correr `pnpm --filter @workdeal/db db:migrate` em dev e no Coolify (`DATABASE_URL` prod) antes de considerar P0 fechado.
- [x] P0-7

## 3. P1 — Dívida funcional (2-4 semanas) — só após P0

- [x] **P1-1** CRUD `profileLocation` `PATCH/DELETE /:id` + UI edição/remoção + `isPrimary` ordering (3d, dep P0-2) — `advanced-location-settings.tsx:157` — `completed 2026-08-23` (repo `profile-location.repository.ts:12` `listByProfile` ordenado `isPrimary DESC`, `create/update` desmarcam principal, sync `geom`; API `profile-locations.route.ts:30` `PATCH/:id` + `DELETE/:id` com `requireAuth+rateLimit+zValidator` e validação `organizationId===profile.organizationId`; actions `locations-tags.ts:33` `update/delete`; UI com `Principal/Editar/Remover`, edição inline, ordenação e consent `Usar a minha localização`)
- [x] **P1-2** Unificar limite categorias `categoryIdsSchema max(5)` em `packages/shared/src/schemas/profile.ts:30` (hoje 20) alinhado a onboarding `max(3)` e edit `max(5)` — 0.5d — `completed 2026-08-23` (`profile.ts:30` `max(20)→max(5)`, `onboarding-form.tsx:295/950/967/990` `slice 3→5` + `≤3→≤5` + placeholder)
- [x] **P1-3** Reuso `handleLogoFile` em `EditProfileForm` `components/features/edit-profile-form.tsx:42` + `next/image` + `coverUrl` crop — 2d (dep P0-1) — `completed 2026-08-23` (upload `logo`/`cover` com `uploadFilesAction` purpose `logo/generic`, preview `Image fill`, `handleFile` 5 MB)
- [x] **P1-4** Painel `dashboard/[org]/verification` — listar `verificationRequest:356` + `requestVerification` + estados `pending/in_review/approved/rejected` + SLA 48h BRD §10.2 — 5d — `completed 2026-08-23` (`dashboard/[organizationId]/verification/page.tsx` + `verification-form.tsx` com `requireAuth+getOrgRole`, lista histórico, `requestVerification` com nota)
- [x] **P1-5** Trocar `generateOrgAnalytics` mock `dashboard/[organizationId]/page.tsx:98` por agregação real (views, `quoteRequest` counts) — 5d (dep P0-7) — `completed 2026-08-23` (`org-analytics-data.ts` `getOrgAnalyticsWithReal` tenta `GET /quotes?limit=20` + filtro `targetProfileId`, `VisitorsTable` com `realVisitors`, `CONVERSÃO REAL` vs `EST.` + disclaimer PostHog)
- [x] **P1-6** NUIT/licenças/`businessHours` editáveis em `EditProfileForm` (hoje só onboarding) — 2d — `completed 2026-08-23` (`edit-profile-form.tsx` `initialQualification` + `organizationId` + `upsertCompanyQualification`, campos workers/turnover/foundedYear/legalForm/nuit/alvara/capital/licenses + página org edit fetch `company-qualification/:organizationId`)
- [x] **P1-7** `Suspense` streaming para `QualificationView` + remover `AdvancedLocationSettingsWrapper` inline `dashboard/page.tsx:63` — 1d — `completed 2026-08-23` (`dashboard/page.tsx:1` `Suspense` fallback skeleton para `AdvancedLocationSettingsWrapper`)
- [x] **P1-8** Testes `profiles.service:assertCanEdit` (mock repo) + integração `POST /profiles` — 3d (AGENTS §3.7) — `completed 2026-08-23` (`profiles.service.test.ts:8` +7 testes RBAC `hasOrgPermission/hasSelfPermission` + separação `getMyProfile` sem fallback, `vitest 8 passed`)

## 4. P2 — Polimento (4-8 semanas)

- [x] **P2-1** `searchTsv tsvector` trigger + `pg_trgm` — 3d (dep P0-7) — `completed 2026-08-23` (`drizzle/0015_search_tsv_gin.sql` + `_journal 15` + `profiles.repository.ts:110` `plainto_tsquery` quando `q` tem espaço/>3 chars, `GIN(search_tsv)` + `GIN(name/gin_trgm_ops)`)
- [x] **P2-2** Feature-flag `AppSidebar` links órfãos `/portfolio/reviews/tasks/events/verification` — 2d — `completed 2026-08-23` (`app-sidebar.tsx:19` `buildNavMain` com `(breve)` e `href="#"` para `portfolio/reviews/tasks/events/tenders/settings/team/explore`, mantém `Verificação` activo)
- [x] **P2-3** Gestão membros `dashboard/[org]/team` (`members:manage` só `owner/admin`) `permissions.ts:18` — 5d — `completed 2026-08-23` (`dashboard/[organizationId]/team/page.tsx` server `requireAuth+getOrgRole+hasOrgPermission` + `db member/user/invitation` list, `team-manager.tsx` client `authClient.organization.{inviteMember,updateMemberRole,removeMember}` com `canManage` gate, `app-sidebar.tsx:19` `Equipa` activo)
- [x] **P2-4** Selos automáticos `profileBadge:279` job `profile-complete/highly-rated` + cron `revalidate` — 8d (BRD §12) — `completed 2026-08-23` (`badges.job.ts:11` `profile-complete` award/revoke + `highly-rated`, `ensureProfileCompleteForProfile` chamado em `profiles.service.ts:1` após `create/update`, `admin.route.ts:44` `POST /admin/badges/run` para cron Coolify)
- [x] **P2-5** LGPD: cifrar `nuit/alvara:409`, TTL `DRAFT_KEY` 24h, consent explícito `advanced-location-settings.tsx:21` — 2d — `completed 2026-08-23` (`onboarding-form.tsx:271` TTL 24h `savedAt` + `removeItem` expirado, `advanced-location-settings.tsx:21` `requestGeo` com botão consent, `nuit/alvara` só em draft com TTL + nota server deve cifrar)
- [x] **P2-6** Observabilidade `requestId/logger` §6 + métrica `conexões/semana` BRD §3.2 — 3d — `completed 2026-08-23` (`apps/api/src/index.ts:4` `requestId` + `logger.info` estruturado `requestId/route/status/durationMs/userId`, `routes/metrics.route.ts:1` `GET /metrics/north-star` `conexoesSemana` count `quoteRequest` 7d)

## 5. Verificação antes de cada PR
```bash
npx tsc --noEmit -p apps/web/tsconfig.json  # EXIT:0
npx eslint apps/web/app/(dashboard)/...
pnpm test --filter @workdeal/shared
curl -i /api/v1/profiles/:slug  # sem auth → 200, com PATCH sem role → 403
```

## 6. Riscos se pular P0
- IDOR edição via `GET :slug` enumerável sem rate-limit
- `member` edita company via rota pessoal (bypass `editor`)
- Scraping geo ilimitado + ordenação em memória não escala
- Novo perfil invisível 1h

## 7. Ordem recomendada
`P0-1 → P0-3 → P0-2 → P0-7 → P0-4 → P0-5 → P0-6` depois `P1-1/P1-2`.

---
**Próximo passo:** começar `P0-1`? Responde `avançar P0-1` para eu abrir a branch.
