# Plano — WS3.1 Admin: Verificações e Denúncias

## Goal
Desbloquear a equipa de operações Workdeal com endpoints de moderação produtivos: fila de verificação de perfis (NUIT/BI) e gestão de denúncias, ambos protegidos por `requireSystemRole('admin','moderator')`, com SLA 48h mensurável e sem quebrar contratos existentes (`GET /health`, `/profiles`, `/reviews`, `/follows`).

## Success Criteria
- `GET /api/v1/admin/verifications?status=pending&page=1&limit=20` lista fila ordenada por `createdAt ASC`, paginada, só para `moderator|admin` (401 sem auth, 403 para `user`)
- `POST /api/v1/admin/verifications/:id/approve|reject` com `{reviewNote?}` transiciona `pending|in_review → approved|rejected`, seta `reviewerUserId/reviewedAt/reviewNote`, e em `approved` atribui selo `Verificado` (`profile_badge` + `organization.verificationStatus=verified|verifiedAt` quando `profile.type=company`)
- `POST /api/v1/reports` (autenticado, rate-limited) cria denúncia; `GET /api/v1/admin/reports?status=pending` + `PATCH /admin/reports/:id` (`resolved|dismissed`) só para moderação
- Nenhuma regressão em `GET /health|/health/db|/profiles?near|/reviews|/follows`
- Métrica: `avg(verifiedAt - createdAt)` exposta em `GET /admin/metrics` ou log estruturado

## Context And Current Facts
- Schema já existe: `verification_request` [packages/db/src/schema.ts:348](packages/db/src/schema.ts:348) (`pending|in_review|approved|rejected`, `documents jsonb`, `reviewerUserId`, `reviewedAt`), `report` [packages/db/src/schema.ts:366](packages/db/src/schema.ts:366) (`profile|review|task|event`, `pending|resolved|dismissed`), `profileBadge` [packages/db/src/schema.ts:271](packages/db/src/schema.ts:271), `organization.verificationStatus` via `better-auth` [packages/auth/src/server.ts](packages/auth/src/server.ts)
- RBAC pronto: `requireSystemRole(...roles)` e `requireOrgPermission` em [apps/api/src/middlewares/rbac.middleware.ts](apps/api/src/middlewares/rbac.middleware.ts:31), `requireAuth` verifica `deletedAt` em [apps/api/src/middlewares/auth.middleware.ts](apps/api/src/middlewares/auth.middleware.ts:26), `errorHandler` já usa `logger` [apps/api/src/lib/errors.ts](apps/api/src/lib/errors.ts:17)
- Envelope `ok(data, meta)`/`fail(code,message)` em [apps/api/src/lib/api-response.ts](apps/api/src/lib/api-response.ts:1), `rateLimit` em [packages/shared/src/lib/rate-limit.ts](packages/shared/src/lib/rate-limit.ts:1) já usado em profiles/reviews
- Nenhuma rota `/admin` existe hoje — `apps/api/src` tem `routes: auth|categories|follows|health|profiles|reviews` e `controllers`/`repositories`/`services` correspondentes
- Seeds já criam `badge/verificado` (`slug=verificado`, `manual`) em [packages/db/src/seed.ts](packages/db/src/seed.ts:23) — reutilizável para atribuição automática
- Validação é via `zod` + `@hono/zod-validator` partilhando schemas em `packages/shared/src/schemas/*`

## Constraints And Non-goals
- Não criar nova infraestrutura (fila/broker) neste slice — atribuição de selo é transacional síncrona; worker BullMQ fica para WS3.2 (tenders)
- Não implementar upload de ficheiros — `documents: jsonb` recebe URLs/refs já validadas no frontend; storage S3 fica fora de escopo
- Não expor `organization.verificationStatus` mutável por `user` — só via admin
- Não quebrar contrato `pnpm-workspace.yaml`/`workspace:*` (instalação é `pnpm install` na raiz, não `bun add` por app)
- Rate-limit em memória basta (single-replica Coolify); Redis fica para multi-réplica futura

## Key Decisions
1. **Reutilizar tabelas existentes vs nova migração:** Reutilizar `verification_request` e `report` sem migração; adicionar apenas índices se `EXPLAIN` mostrar falta (`verification_request_status_idx`, `report_status_idx` já existem). *Rejeitado:* criar `admin_*` tables — duplicaria semântica.
2. **Transição de estado:** Máquina `pending→in_review→approved|rejected` e `pending→in_review→approved`→`pending` (re-submissão cria nova linha, não reabre). *Rejeitado:* `UPDATE` arbitrário de `status` pelo client — só `approve|reject` via service.
3. **Efeito colateral de approve:** Transação única `verification_request.update + profile_badge.insert(onConflictDoNothing) + organization.update(verifiedAt)` quando `company`. *Rejeitado:* evento assíncrono — adicionaria latência e necessidade de compensação sem volume que justifique.
4. **Autorização:** `GET/POST/PATCH /admin/*` → `requireAuth + requireSystemRole('admin','moderator')`; `POST /reports` → `requireAuth + rateLimit(10/min)`. `hasSystemPermission` já cobre `verifications:review|reviews:moderate` em [packages/shared/src/permissions.ts](packages/shared/src/permissions.ts:24) mas o middleware fica explícito por rota para legibilidade. *Rejeitado:* `requireOrgPermission` para admin — não é recurso de org.
5. **Rate-limit e cache:** `GET /admin/*` `no-store`; `POST /reports` `10/min` por IP como em reviews. *Rejeitado:* cache em admin — dados voláteis e sensíveis.

## Recommended Approach
Adicionar um domínio `admin` isolado que reutiliza `profile`/`organization`/`badge` existentes:
- Novos `packages/shared/src/schemas/verification.ts` e `report.ts` (Zod) para validar `reviewNote` (trim, max 1000) e `reason/details`
- `repositories/verifications.repository.ts` e `reports.repository.ts` (queries com `eq/and/isNull/sql`, paginação `page/limit≤50`, ordenação `createdAt ASC` para SLA)
- `services/verifications.service.ts` (máquina de estados + transação + atribuição de selo `verificado` resolvido por `slug`) e `services/reports.service.ts`
- `controllers/*` finos + `routes/admin.route.ts` montado em `/api/v1/admin` + `routes/reports.route.ts` público para criação
- Reuso de `createRateLimiter`, `fail/ok`, `AppError(403/404/409/422)`, `logger`
- `GET /admin/metrics` mínimo: `pendingCount`, `avgVerificationHours`, `reportsPending` (SQL `avg(verifiedAt-createdAt)`)

## Work Plan
**Unit A — Verificações (PR1):**
- `packages/shared/src/schemas/verification.ts` (`approveSchema: {reviewNote?: string(max 1000)}`, `listQuerySchema: {status?, page, limit}`)
- `apps/api/src/repositories/verifications.repository.ts` (`listByStatus`, `findById`, `updateStatus`)
- `apps/api/src/services/verifications.service.ts` (valida transição, transação, atribui `badge.slug=verificado`, atualiza `organization`)
- `apps/api/src/controllers/verifications.controller.ts` + `apps/api/src/routes/admin.route.ts` (`GET /verifications`, `POST /verifications/:id/approve|reject`, `GET /metrics`)
- Montagem em `apps/api/src/index.ts` (`/api/v1/admin`)
- Testes: `apps/api/src/services/verifications.service.test.ts` + `apps/api/tests/verifications.test.ts` (supertest, sem DB real via mock repository)

**Unit B — Denúncias (PR2, depende de A apenas para rota `/admin` existir):**
- `packages/shared/src/schemas/report.ts` (`targetType`, `reason max200`, `details max2000`)
- `repositories/reports.repository.ts`, `services/reports.service.ts`, `controllers/reports.controller.ts`, `routes/reports.route.ts` (`POST /reports`) + extensão de `admin.route.ts` (`GET /reports`, `PATCH /reports/:id`)
- Rate-limit e validação `targetExists` (lookup em `profile|review` conforme `targetType`)
- Testes equivalentes

Ordem: A → B (B pode começar em branch paralela após `admin.route.ts` existir). Publicar exatamente em 2 PRs separados, na ordem A,B, mesmo que o diff caiba num commit.

## Validation Plan
- `pnpm typecheck && pnpm lint && pnpm build` — sem `TS2307 vitest` (vitest já em root `package.json:18`)
- `pnpm test --filter @workdeal/api` — unit de máquina de estados + `409 REVIEW_ALREADY_EXISTS` (reviews) não regredido
- Manual (com `DATABASE_URL` de `docker compose up -d db` + `pnpm --filter @workdeal/db db:migrate && db:seed`):
  - `curl -H "Authorization: Bearer <moderatorJWT>" GET /api/v1/admin/verifications?status=pending` → 200, `meta.total`, ordenado `createdAt ASC`
  - `POST /admin/verifications/:id/approve` → 200, `profile_badge` contém `verificado` (`GET /profiles/:slug` mostra selo), `organization.verifiedAt` preenchido para company
  - `POST /admin/verifications/:id/approve` repetido → `409` ou `422` (transição inválida)
  - `POST /reports` sem auth → 401; `GET /admin/reports` como `user` → 403; como `moderator` → 200; `PATCH /reports/:id {status:resolved}` → 200, `updatedAt` muda
  - `GET /health` e `GET /health/db` ainda 200/503 conforme DB, sem regressão em `GET /profiles?near=&sort=distance`
- Risco mais alto a validar: transação de `approve` (se `badge` não existir, não deve deixar `verification_request` em `approved` sem selo)

## Risks / Rollback
- **Risco:** `badge.verificado` ausente no seed → `approve` falha silenciosa. Mitiga: service faz `findBySlug('verificado')` e lança `500 BADGE_NOT_SEEDED` com log `logger.error` se não existir.
- **Risco:** `documents jsonb` sem validação de URL → storage abusivo. Mitiga: Zod valida `array(url, max 5, max 2MB ref)` e `AppError 400`.
- **Rollback:** Desmontar `app.route("/api/v1/admin")` e dropar rotas `reports` POST (feature-flag via `requireSystemRole` já isola). Migração é no-op (sem DDL), então rollback é só revert de código + `DELETE FROM profile_badge WHERE badgeId=verificado AND awardedAt > deploy`.

## Open Questions
- `verification_request` deve bloquear `profile.status=suspended` de ser aprovado? Assunção: não — `suspended` é moderação separada, mas `approve` de `suspended` exige `admin` (não `moderator`). Confirmar com Product.
- `report.targetId` deve validar existência do alvo em `task|event` que ainda não existem? Assunção: validar só `profile|review` por agora; `task|event` valida `exists` quando essas tabelas existirem (WS4).
- `GET /admin/metrics` deve ser público para dashboard interno ou protegido? Assunção: protegido `moderator|admin`.
