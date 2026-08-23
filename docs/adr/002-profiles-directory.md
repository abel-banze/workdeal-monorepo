# ADR-002 — Perfis e Directório

| | |
|---|---|
| Estado | Aceite |
| Domínio | Backend — Directório & Reputação |
| Data | Agosto 2026 |
| Decisores | Equipa de desenvolvimento |

---

## 1. Contexto

O PRD define o directório como motor principal da Fase 1: perfis de empresas e de profissionais independentes, pesquisa por proximidade e categoria, selos de confiança, avaliações, e um painel administrativo com fila de verificação e moderação. O ADR-001 fixou a camada de auth (utilizadores, organizações, papéis, JWT). Este ADR fixa o **núcleo estável do domínio** — `profiles` e `categories` (PRD 11.2: desenhá-las como núcleo desde já) — e as tabelas de reputação/verificação que o directório exige na Fase 1.

O ADR-001 estabeleceu dois modos de identidade:
- **Profissional independente** = `user` + perfil 1:1 (sem organização).
- **Empresa** = `organization` + perfil 1:1 (membros via `member` com papéis).

`profiles` é o que se mostra no directório; `user`/`organization` são quem pode agir. Este ADR detalha `profiles` e as tabelas à sua volta, e define como a autorização (ownership, orgRole, systemRole) se aplica aos recursos do directório.

---

## 2. Decisões

### 2.1 `profiles` — identidade dupla, um perfil por identidade

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| type | enum `individual`/`company` | derivável dos links, mantida por conveniência e indexação |
| userId | text (fk → user, nullable) | preenchido **só** para individual; **unique** |
| organizationId | text (fk → organization, nullable) | preenchido **só** para company; **unique** |
| slug | text | único; slug público do directório (`/profiles/{slug}`) |
| name | text | nome público (pode diferir do nome legal — ver 2.8) |
| tagline | text | uma linha de descrição |
| description | text | descrição longa |
| logoUrl / coverUrl | text | imagens (via `next/image`) |
| latitude / longitude | double precision | nullable; usado para pesquisa nearby |
| whatsapp / phone / email / website | text | contactos públicos |
| businessHours | jsonb | horário de funcionamento (estrutura aberta: dias/horas) |
| status | enum `draft`/`active`/`suspended` | `verified` **não** é estado — é o selo "Verificado" (2.6) |
| createdAt / updatedAt / deletedAt | timestamp | soft delete |

- **Exactamente um** dos links é preenchido: `CHECK ((userId IS NOT NULL) <> (organizationId IS NOT NULL))`.
- `unique(userId)` e `unique(organizationId)` garantem 1:1 com a identidade.
- Criação: o perfil é criado automaticamente no onboarding do utilizador (individual) ou com a organização (company); `draft` até o dono o publicar (`active`).

### 2.2 `categories` — árvore estável

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| parentId | text (fk → categories) | árvore de subcategorias |
| slug | text | único |
| name | text | nome em pt-MZ (UI) |
| description | text | |
| isActive | boolean | oculta da listagem sem apagar |
| createdAt / updatedAt | timestamp | |

Categorias são o filtro principal da pesquisa (PRD 6.2). A árvore é gerida pela equipa Workdeal (não há criação aberta na Fase 1). Um perfil pode ter várias categorias:

- `profile_categories(profileId, categoryId, isPrimary, position)` — PK `(profileId, categoryId)`; `isPrimary` sinaliza a categoria principal (usada em listagens/resumo); `position` ordena.

### 2.3 Selos — `badges` (catálogo) + `profile_badges` (atribuições)

| `badges` | tipo | notas |
|---|---|---|
| id, slug, name, description | | slug único, nome em pt-MZ |
| type | enum `trust`/`quality`/`activity`/`reputation`/`specialization`/`network`/`performance`/`commercial`/`promotional`/`informational` | alinhado às 3 famílias do PRD 12 |
| origin | enum `automatic`/`manual`/`paid` | separar confiança de comércio (PRD 16) |
| criteria | text | critério auditável (para automáticos) |
| isActive | boolean | |

| `profile_badges` | tipo | notas |
|---|---|---|
| profileId (fk) + badgeId (fk) | | PK composta |
| origin | enum (como acima) | origem da atribuição concreta |
| status | enum `active`/`revoked` | |
| awardedAt / revokedAt | timestamp | |
| awardedByUserId | text (fk → user) | preenchido quando `manual`/`paid` |

- Selos automáticos são **recalculados por jobs** (não atribuídos uma vez) — os critérios vivem em `badges.criteria` e o cálculo em jobs dedicados (fora do request/response, AGENTS 3.6). Este ADR fixa o modelo de dados; o recálculo é tratado no ADR de jobs/notificações.
- O selo "Verificado" é atribuído manualmente pela equipa após aprovação de `verification_requests` (2.5) — nunca é pago nem automático.

### 2.4 Avaliações — `reviews`

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| profileId (fk) | | avaliado |
| authorUserId (fk → user) | | **só clientes avaliam** (PRD 8.3 / decisão 3) — o `authorUserId` deve ter tido uma interacção real (tarefa/contacto registado) para poder avaliar |
| rating | smallint 1–5 | |
| comment | text | |
| origin | enum `directory`/`task`/`event` | de onde partiu a avaliação |
| createdAt / updatedAt | timestamp | |

- Anti-fraude: `UNIQUE (profileId, authorUserId, origin)` impede a mesma pessoa a repetir avaliação na mesma origem; auto-avaliação bloqueada na aplicação (`authorUserId` ≠ dono do perfil).
- Média/contagem para selos ("Bem Avaliado") derivam destas linhas em jobs.

### 2.5 Verificação e moderação

- `verification_requests(profileId, status enum pending/in_review/approved/rejected, documents jsonb [urls NUIT/BI/alvará], reviewerUserId, reviewedAt, reviewNote, createdAt, updatedAt)` — fila para o painel administrativo (PRD 10.2). Aprovar ⇒ atribui o selo "Verificado" (job/hook na app).
- `reports(reporterUserId, targetType enum profile/review/task/event, targetId, reason, details, status enum pending/resolved/dismissed, createdAt, updatedAt)` — denúncias de conteúdo (PRD 10.2).
- O AC de domínio: `verifications:review`, `reviews:moderate`, `reports:*` são permissões de sistema (moderator/admin) — já na matriz do ADR-001 §4.

### 2.6 Network mínimo (Fase 1)

- `follows(followerUserId, profileId)` — PK composta; seguidos = feed/contactos.
- `portfolio_items(profileId, title, description, imageUrl, sortOrder, createdAt)` — vitrine (PRD 6.1).

> Conexões (pedido/aceitação), feed de actividade e mensagens internas são Fase 2 (ADR próprio), não entram neste schema.

### 2.7 Georreferenciação — nearby

- `latitude`/`longitude` (double precision) em `profiles`, sem extensão PostGIS na Fase 1.
- Queries nearby: **filtro bbox (WHERE) + distância hársine em SQL**, nunca em memória (AGENTS 3.6). Índice `btree` sobre `(latitude, longitude)`.
- **Evolução planeada:** adicionar coluna `geometry(Point)` + índice GiST quando o ambiente (Coolify) tiver PostGIS disponível — a migração é aditiva e não quebra a API. Confirmar disponibilidade de PostGIS antes de a activar (PRD 11.2).

### 2.8 Nome público vs nome legal

- `profiles.name` é o **nome público** do directório (pode ser o nome comercial/diferenciado).
- O **nome legal** (NUIT/BI/alvará) só aparece nos documentos de `verification_requests`, nunca no perfil público. Na Fase 1 não há campo separado em `profiles` — a verificação valida a correspondência entre `profiles.name`/`organization.name` e os documentos.

### 2.9 Autorização nos recursos do directório

| Recurso | Quem pode editar/apagar | Base |
|---|---|---|
| Perfil individual | o próprio `user` (dono) | ownership (`profiles.userId === actor.id`) |
| Perfil de empresa | membro da organização com `profile:edit`/`profile:delete` | orgRole (ADR-001 §4) |
| Avaliações | só clientes com interacção; moderadores moderam | `reviews:moderate` (systemRole) |
| Verificação | equipa Workdeal (`verifications:review`) | systemRole |
| Selos manuais | equipa Workdeal (`badges:manage`) | systemRole |

Regras de UI vs backend: a UI só desenha o estado; a autorização real repete-se no backend/Server Actions (ADR-001 §4.5).

---

## 3. Modelo de dados (resumo)

```
categories 1─N categories (parentId)
profiles 1─N profile_categories N─1 categories
user 1─1 profiles 1─N portfolio_items
organization 1─1 profiles 1─N profile_badges N─1 badges
             profiles 1─N reviews N─1 user (autor)
             profiles 1─N follows N─1 user (seguidor)
             profiles 1─N verification_requests
reports (polimórfico: profile/review/task/event)
```

Todas as tabelas vivem em `packages/db` e são migradas com drizzle-kit, junto às tabelas de auth (ADR-001 §2.1).

---

## 4. Alternativas consideradas

| Alternativa | Motivo da rejeição |
|---|---|
| `verified` como estado do perfil | Estado e reputação misturados; verificação tem historial (documentos/revisor) que um estado não guarda — separou-se em selo + `verification_requests`. |
| Nearby calculado em memória (harvesine no app) | Violaria o AGENTS 3.6 (trazer tudo e filtrar) — não escala nacional (PRD: lançamento em todo o país). |
| PostGIS desde a Fase 1 | Depende da disponibilidade da extensão no ambiente Coolify (por confirmar); a decisão adia-se sem custo — migração aditiva planeada (2.7). |
| Categoria única por perfil (`profiles.categoryId`) | O PRD exige várias categorias por perfil; N:M com categoria principal resolve sem denormalizar. |
| Conexões/mensagens no mesmo ADR | Fase 2; manter o ADR focado no núcleo estável evita bloquear Fase 1 em design de network não validado. |

---

## 5. Questões em aberto

1. Disponibilidade de **PostGIS** no ambiente Coolify actual (activa a evolução 2.7).
2. Regra exacta de "interacção real" para avaliar (tarefa concluída? contacto respondido?) — decisão de produto, não bloqueia o schema (campo `origin` já o suporta).
3. SLA interno de verificação (24h/48h) e se é comunicado publicamente (PRD §19-2).

---

## 6. Próximos passos

1. Criar o schema Drizzle das tabelas desta secção 2 em `packages/db` + migração inicial.
2. Criar `packages/shared` schemas Zod de `profile`/`category`/`review`/`verification` (fonte única para API e Server Actions).
3. Criar repositories + services de perfis no backend (routes `/api/v1/profiles`, `/api/v1/categories`).
4. Seed de categorias inicial (piloto de densidade nacional).
5. Jobs de recálculo de selos automáticos (ADR de jobs/notificações).
