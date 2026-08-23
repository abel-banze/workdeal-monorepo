# Roadmap Workdeal — do Esqueleto ao MVP Demonstrável

> Complemento operacional ao `PRD.md v0.4` e aos `ADR-001/002`. Este documento transforma a avaliação em plano executável. Duração: **8 semanas**, equipa sugerida: 1 Backend + 1 Frontend + 1 Product/Ops (verificação).

| Meta | Estado |
|---|---|
| PRD v0.4 avaliado | 7.2/10 — fechar v0.5 na Semana 1 |
| Execução actual | ~35% do MVP Fase 1 (fundação sólida, produto esqueleto) |
| Saída deste roadmap | MVP beta fechado demonstrável: `pesquisa nearby → perfil SSR → contacto` com métricas NSM |

## Princípios (AGENTS.md)

1. **SSR-first** — tudo Server Component, `use client` só na folha interactiva.
2. **Mutações via Server Actions** — Hono é para consumidores externos; nunca `fetch` do browser.
3. **Lógica partilhada em `packages/shared`** — selos, geo, permissões.
4. **`route → controller → service → repository`** — sem Drizzle fora de repository.
5. **`revalidate` consciente** — directório 60m + `revalidateTag`, nearby `no-store`, tenders 5-10m.
6. **Sem estado em memória** — workers/filas para tudo que é lento (scraper, alertas, selos).

---

## Definição de "Done" do MVP (critério de saída)

O MVP só sai de beta quando, em 3 províncias com 30 perfis semeados:

- [ ] Visitante anónimo faz `GET /profiles?q=electricista&near=-25.96,32.59&radius=10km` com `p95 < 300ms`, paginação obrigatória, índice geoespacial (PostGIS).
- [ ] `GET /profiles/:slug` é SSR, tem `generateMetadata` + JSON-LD, `loading.tsx`/`not-found.tsx`, `next/image`.
- [ ] Conversão `pesquisa → contacto (WhatsApp/mensagem)` ≥ 8% medida via `contact_click`.
- [ ] `NSM ≥ 15 conexões de valor/semana` (tarefa atribuída | inscrição evento | contacto com resposta).
- [ ] Verificação de perfil `p50 < 48h` no painel admin sem intervenção de dev.
- [ ] Scraper UFSA idempotente, com alerta de falha e revisão manual antes de publicar.
- [ ] `pnpm typecheck && lint && build` verde em CI, 1 teste unitário + 1 integração por domínio crítico.

---

## Backlog por Workstream

### WS0 — Fundação & Qualidade (P0) — Semana 1-2

| # | Issue | Owner | Est. | Dep. | Aceite |
|---|---|---|---|---|---|
| 0.1 | PRD v0.5: fixar critérios de selos (`Bem Avaliado ≥4.3/N≥5`, `Resposta Rápida p50<2h/30d`), targets NSM, RNfs (p95, RPO/RTO, LGPD 22/2024) | Product | 2d | PRD | PR revisado |
| 0.2 | ADR-003 Tenders + ADR-004 Search/Geo (PostGIS vs Haversine fallback, `tsvector` vs Meilisearch) | Backend | 1d | 0.1 | ADRs aceites |
| 0.3 | `packages/shared/lib/env.ts` + `apps/api/src/env.ts` com Zod, `fail-fast` no arranque, `ALLOWED_ORIGINS` nunca `*` | Backend | 0.5d | — | App não arranca com env inválida |
| 0.4 | Docker Compose `postgres:16 + postgis` + `drizzle-kit` com extensão, `docs/runbook` backup/restore | Backend/DevOps | 1d | 0.3 | `CREATE EXTENSION postgis` OK |
| 0.5 | CI: `turbo typecheck lint build` + cache, branch protection | DevOps | 0.5d | — | PR bloqueia se vermelho |
| 0.6 | Harness testes: Vitest + supertest + DB de teste; 1 unit `profilesService` + 1 integração `POST /api/v1/profiles` | Backend | 2d | 0.3 | `pnpm test` passa em CI |
| 0.7 | Seeds: `categories` árvore PT-MZ + 8 `badges` (sec 12 PRD) | Backend | 1d | 0.2 | `SELECT count(*) FROM category ≥ 15` |

### WS1 — Directório & Pesquisa (P0) — Semana 3-5

| # | Issue | Owner | Est. | Dep. | Aceite |
|---|---|---|---|---|---|
| 1.1 | Full-text `tsvector` + `pg_trgm` em `profile.name/description`, índice `GIN`, query `q` com ranking | Backend | 2d | 0.4,0.7 | `EXPLAIN` usa índice |
| 1.2 | Geo `ST_DWithin` + `GIST(profile_geo_idx)` + `lib/geo.ts` (bounding box, distância) | Backend | 2d | 0.4 | `nearby` <300ms p95 com 10k perfis |
| 1.3 | `GET /api/v1/profiles?query=&category=&near=&radius=&badges=&page=&limit=` com paginação obrigatória + `GET /api/v1/profiles/:slug` | Backend | 2d | 1.1,1.2 | Paginação sem `limit` → 400 |
| 1.4 | `app/(directory)/search/page.tsx` + `app/(directory)/profiles/[slug]/page.tsx` SSR, `Suspense` para reviews, `loading.tsx/error.tsx/not-found.tsx` | Frontend | 3d | 1.3 | Lighthouse TTFB não bloqueia em reviews lentas |
| 1.5 | `generateMetadata` + JSON-LD `LocalBusiness`, `next/image` para `logoUrl/coverUrl` | Frontend | 1d | 1.4 | Rich results válido no validator |
| 1.6 | Lista/mapa toggle, favoritos (local + persistido se auth) | Frontend | 2d | 1.4 | Toggle sem remontar lista |

### WS2 — Reputação & Network Mínimo (P0) — Semana 5-6

| # | Issue | Owner | Est. | Dep. | Aceite |
|---|---|---|---|---|---|
| 2.1 | `reviews` — só cliente avalia, `UNIQUE(profileId, authorUserId, origin)`, sem auto-avaliação, `origin` ligado a tarefa/contacto real | Backend | 2d | WS1 | 2ª review mesmo `origin` → 409 |
| 2.2 | `follows` + `portfolio_items` CRUD + `isPrimary` categorias | Backend/Frontend | 2d | WS1 | CRUD passa por Server Action + `revalidateTag('profile')` |
| 2.3 | Job selos automáticos: `Perfil Completo`, `Bem Avaliado`, `Resposta Rápida` recalculado 1x/dia (BullMQ), `profile_badges` com `revokedAt` | Backend | 2d | 0.2 | Selo revogado quando critério deixa de valer |
| 2.4 | UI `BadgeList`, `Reviews`, `FollowButton` (`use client` só na folha) | Frontend | 2d | 2.1-2.3 | — |

### WS3 — Operação & Concursos (P0) — Semana 6-7

| # | Issue | Owner | Est. | Dep. | Aceite |
|---|---|---|---|---|---|
| 3.1 | Painel admin `/(dashboard)/admin`: fila `verification_requests` (aprovar/rejeitar + `reviewNote`), `reports`, `badges:manage` | Frontend+Backend | 3d | WS2 | `requireSystemRole('admin','moderator')` em todas as rotas |
| 3.2 | `tenders` + `tender_alerts` (já existe infra Workdeals) — scraper UFSA worker BullMQ, idempotência por `sourceId`, `tenders.fonte='UFSA'` | Backend | 3d | 0.2 | Re-run não duplica |
| 3.3 | Alertas `email/WhatsApp/Telegram` via fila, preferências por `categoria/província/prazo`, `revalidate 5-10m` na página tender | Backend | 2d | 3.2 | Falha de envio não bloqueia request |
| 3.4 | Observabilidade: `logger` com `requestId`, métricas `error_rate/latency`, alerta falha scraper/notificações | Backend/DevOps | 1d | 3.2 | Alerta dispara em <5m |

### WS4 — Oportunidades Flagged (P1) — Semana 8

| # | Issue | Owner | Est. | Dep. | Aceite |
|---|---|---|---|---|---|
| 4.1 | `events` (restrito a `verified`), `event_rsvps`, lembrete automático | Backend/Frontend | 2d | 3.1 | Criar evento sem `Verificado` → 403 com mensagem PRD 7.1 |
| 4.2 | `tasks` + `task_proposals` (sem pagamento — `amount` + `payoutStatus` só no schema), `task_disputes` com revisão manual | Backend | 3d | WS1 | Comissão não cobrada mas schema pronto |

---

## Cronograma (8 semanas, sprints de 1 semana)

```
S1: 0.1 0.2 0.3 0.4 0.5
S2: 0.6 0.7 1.1 1.2
S3: 1.3 1.4 (SSR)
S4: 1.5 1.6 2.1
S5: 2.2 2.3 2.4
S6: 3.1 3.2
S7: 3.3 3.4 4.1
S8: 4.2 Beta fechado + harden + métricas NSM
```

Caminho crítico: `0.4 → 1.1/1.2 → 1.3 → 1.4 → 3.1 → beta`. Atraso em PostGIS ou CI bloqueia tudo — mitigar com fallback Haversine em `lib/geo.ts`.

---

## Riscos & Mitigação já mapeados (PRD sec 16 + execução)

- **Directório vazio fora de Maputo** → semear 30 perfis via Apify/Workdeals em 3 províncias na S8, categorias-piloto (construção, eventos, serviços admin) primeiro.
- **Selos pagos corroem confiança** → separar `origin=paid` nunca exibe check de confiança; auditoria trimestral.
- **UFSA muda HTML** → checksum + `try/catch` → `AppError` → alerta Slack/email + painel permite importar CSV manual.
- **Equipa verificação não escala** → SLA 24-48h comunicado só após S6, fila priorizada por `createdAt` + província.

---

## Próximos 3 passos imediatos

1. `git config --global --add safe.directory /mnt/c/Users/COIN-/onedrive/desktop/projects/workdeal-monorepo` + `pnpm typecheck` (validar base).
2. Criar issues `0.1` a `0.7` e branch `feat/ws0-foundation`.
3. Marcar review PRD v0.5 com Product + Ops para travar critérios de selos.

> Este roadmap é o `plan` — não correu `build/test` longo nesta passagem a pedido do utilizador. Ao implementar, cada WS fecha com `pnpm build && pnpm typecheck` + teste do workstream.
