# ADR-004 — Pesquisa e Nearby (Search & Geo)

| | |
|---|---|
| Estado | Aceite |
| Domínio | Backend — Directório & Search |
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
- `Cache-Control`: directório `s-maxage=3600, stale-while-revalidate`, nearby `no-store`, tender `s-maxage=300`.

### 4. Índices
- `profile(type,status)`, `profile_category(categoryId)`, `profile_geom_gist_idx`, `profile_tsv_idx`.
- Paginação `LIMIT/OFFSET` para MVP; cursor (`createdAt+id`) na Fase 2 se volume exigir.

## Consequências
- Sem dependência externa de search na Fase 1 — deploy Coolify simples.
- Nearby já preparado para PostGIS mas não quebra sem ele.
