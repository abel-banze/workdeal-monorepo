# ADR-004 — Pesquisa e Nearby (Search & Geo)

| | |
|---|---|
| Estado | Aceite |
| Domínio | Directório & Search (backend + frontend) |
| Data | Agosto 2026 |
| Decisores | Equipa Workdeal |

## Contexto
PRD 6.2 exige pesquisa por palavra-chave + filtros (categoria, distância, selos, avaliação) + vista lista/mapa + nearby geolocalizado. AGENTS.md 3.6 exige índice geoespacial, nunca cálculo em memória.

## Decisões

### 1. Motor de pesquisa — Postgres nativo (Fase 1)
- `tsvector` em `profile.name/description` + `pg_trgm` para typo tolerance. Reavaliar Meilisearch/Typesense só se `>50k perfis` ou latência >300ms p95.
- Índice `GIN` em `tsvector`, `GIN trigram` em `name`. Query `websearch_to_tsquery('portuguese', q)`.

### 2. Geo — PostGIS com fallback Haversine
- Coluna `profile.geom geography(Point,4326)` + `GIST` (migração 0002). Query primária `ST_DWithin(geom, ST_MakePoint(lng,lat)::geography, radiusM)`.
- Fallback `haversineKm` em `packages/shared/lib/geo.ts` quando extensão indisponível (dev sem PostGIS, CI sem Docker).
- `boundingBox` para pré-filtro e `normalizeCoordinates` (6 casas decimais).

### 3. API de listagem
- `GET /api/v1/profiles?query=&category=&near=lat,lng&radiusKm=&badges=&sort=&page=&limit=` — `limit` obrigatório (max 50), `page` 1-indexed. Sem `limit` → 400.
- O mesmo contrato de `near=lat,lng` + `radiusKm` aplica-se a `GET /api/v1/tasks` e `GET /api/v1/events`. `near` é validado por regex (`^-?\d+(\.\d+)?,-?\d+(\.\d+)?$`), `radiusKm` coerced number entre `0.5` e `500` (default `25`).
- Implementação: pré-filtro por `boundingBox` nas colunas `latitude`/`longitude` (funciona sem PostGIS) + ordenação por `ST_Distance(geom, ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography)` quando `near` presente; sem `near`, ordenação default (tasks `createdAt desc`, events `startAt asc`).
- `Cache-Control`: directório `s-maxage=3600, stale-while-revalidate`, nearby `no-store`, tender `s-maxage=300`.

### 4. Frontend — consentimento de localização e localização por omissão
- Banner de consentimento (client-only) montado no layout público `app/(directory)`. Ao aceitar: `navigator.geolocation` → reverse geocode do nome do local → cookies `workdeal_loc` (coords), `workdeal_loc_label`, `workdeal_loc_declined` (30 dias, `path=/; samesite=lax`).
- Server Components lêem os cookies (`parseLocationCookies` em `apps/web/lib/location-consent.ts`) e aplicam `near`/`radiusKm=25` por omissão às listagens (companies, tasks, events, featured da homepage) — só quando o URL NÃO tem `near` explícito (`applyDefaultLocation`). A localização default não obriga a JS no servidor (SSR) e pode ser substituída pela URL.
- `nearLabel` (etiqueta legível do local) é frontend-only: viaja no URL para UI/chips, mas é descartada pela validação Zod do backend.
- Filtros (home, companies, tasks, events) escrevem `near&radiusKm&sort=distance&nearLabel=` nos URLs; botão "perto de mim" usa as mesmas regras e o input de endereço reutilizável é `LocationSearchBox` (`apps/web/components/features/location-search.tsx`).

### 5. Índices
- `profile(type,status)`, `profile_category(categoryId)`, `profile_geom_gist_idx`, `profile_tsv_idx`.
- Paginação `LIMIT/OFFSET` para MVP; cursor (`createdAt+id`) na Fase 2 se volume exigir.

## Consequências
- Sem dependência externa de search na Fase 1 — deploy Coolify simples.
- Nearby já preparado para PostGIS mas não quebra sem ele.
