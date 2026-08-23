# ADR-001 — Autenticação e Autorização

| | |
|---|---|
| Estado | Aceite (rev. 3) |
| Domínio | Backend — Auth & RBAC |
| Data | Agosto 2026 |
| Decisores | Equipa de desenvolvimento |

---

## 1. Contexto

O PRD define dois planos de controlo de acesso:

1. **Papel de sistema** (por utilizador): `user`, `moderator`, `admin` — para o painel administrativo interno.
2. **Papel de organização** (por membro de uma empresa): `owner`, `admin`, `editor`, `member` — para controlar quem actua em nome de um perfil de empresa.

A stack (AGENTS.md) aponta para better-auth com plugin de organizações, Drizzle e PostgreSQL. Duas realidades do produto condicionam o desenho:

- Existem **profissionais independentes que não pertencem a nenhuma organização** — a sua identidade é o próprio utilizador, e a autorização resolve-se por **propriedade** (owning the resource), não por papel de organização.
- A autenticação deve ser **baseada em JWT** (access token assinado), com refresh/revogação.

Este ADR fixa o desenho concreto: modelo de identidade, JWT, modelo de dados, fluxos, middlewares e regras de segurança.

---

## 2. Decisões

### 2.1 better-auth integrado com schema Drizzle próprio

As tabelas de auth (`user`, `session`, `account`, `verification`), as do plugin de organizações (`organization`, `member`, `invitation`) e as do plugin JWT (`jwks`) são **definidas e migradas por nós** em `packages/db` (schema Drizzle), e passadas ao better-auth via a opção de schema customizado.

Racional:
- Uma única fonte de verdade para o schema (base para migrações e para tabelas de domínio que referenciam `user`/`organization`).
- Permite campos custom (`systemRole`, `phone`, soft delete) sem workarounds de metadata.
- Controlo de índices/constraints e da chave assimétrica do JWT.

> **Correcção (rev. 3):** o better-auth 1.6.26 declara `drizzle-orm: ^0.45.2` como peer dependency (em `better-auth` e em `@better-auth/drizzle-adapter`). Para garantir uma única instância de `drizzle-orm` no monorepo (o adapter importa `eq`/`and` do seu próprio copy — dois copies de versões diferentes quebram o Drizzle, que usa símbolos internos por instância), `packages/db` usa **`drizzle-orm@0.45.x` + `drizzle-kit@0.31.x`** (linha suportada pelo better-auth), em vez de `1.0.0-rc.4`. `apps/api` deixa de declarar drizzle/pg directamente — passa a vir via `@workdeal/db`.

### 2.2 Três eixos de autorização

| Eixo | Onde vive | Decide |
|---|---|---|
| **systemRole** | `user.systemRole` (`user`/`moderator`/`admin`) | Privilégios globais (moderação, painel admin) |
| **orgRole** | `member.role` (`owner`/`admin`/`editor`/`member`) | Acções sobre recursos de uma organização |
| **ownership** | `resource.userId === actor.id` | Acções do utilizador sobre **os seus próprios** recursos (perfil individual, tarefas próprias) |

Os três eixos são ortogonais. Um profissional independente é resolvido pelos eixos **systemRole + ownership** (sem organização). Um membro de empresa é resolvido por **systemRole + orgRole**. O mesmo utilizador pode ter **ambos**: perfil individual próprio **e** ser membro de uma ou mais empresas — são identidades distintas mas não exclusivas.

Matriz de permissões de domínio em `packages/shared/permissions.ts` (única fonte usada por middlewares e pela UI, que só desenha estado — nunca autoriza). O AC do plugin de organizações cobre apenas as operações nativas de org/member/invitation.

### 2.3 Modelo de identidade

- **Profissional independente** = `user` (identidade auth) + 1 perfil público em `profiles` (1:1 via `profiles.userId`). Sem organização envolvida. Actua em nome próprio; autorização por ownership.
- **Empresa** = `organization` (container auth multi-tenant) + 1 perfil público em `profiles` (1:1 via `profiles.organizationId`). Os membros são `member` com papéis.
- **Empregado/membro de empresa** = `user` com linha(s) em `member` apontando a uma ou mais `organization`. Pode também ter o próprio perfil individual.

Os campos de negócio (categorias, coordenadas, contactos, portfólio, selos) ficam em `profiles`; `organization` guarda identidade (`name`, `slug`, `logo`) e estado de verificação. O detalhe de `profiles` é tratado no ADR seguinte.

> Não fundir `organization` e `profile` de empresa: `organization` é quem pode agir (auth); `profile` é o que se mostra (directório).

### 2.4 Autenticação baseada em JWT

Modelo dois-token (padrão da indústria, suportado nativamente por better-auth 1.6.26):

- **Access token (JWT)** — curto (15m), assinado com **EdDSA (Ed25519)**, chave assimétrica guardada em `jwks` (com rotação). Carregado em `Authorization: Bearer <jwt>`.
- **Refresh token** — sessão opaca em base de dados (tabela `session` do better-auth), com sliding/rotação nativa. Usado para obter novos access tokens.

**Claims do JWT** (via `definePayload`/`getSubject`): `sub` (userId), `systemRole`, `sessionId`, `iss`, `aud`, `iat`, `exp`. Não incluímos org roles no JWT — a pertença a organizações pode mudar e deve ser re-avaliada contra a BD quando aplicável (evita claims stale).

**Emissão:**
- O plugin `jwt` emite o JWT após login e em `GET /api/auth/token` (requer sessão válida via cookie ou bearer) — responde `{ token }`.
- Chaves públicas disponíveis em `GET /api/auth/jwks` para verificação local (estateless).

**Storage e transporte do access token:**

*Persistência — cookie httpOnly dedicado:*
- O JWT é guardado num cookie **`workdeal_jwt`**, `httpOnly`, `sameSite: lax`, `secure` em produção, **path `/`** — aguenta recarga/refresh e é invisível ao JS.
- Definido no sign-in e renovado no refresh (o response do `/token` ou do get-session reescreve o cookie).

*Transporte — sempre no header `Authorization: Bearer <jwt>`* (nunca no corpo/query da request):
- **Frontend → Backend, chamadas server-side (Next → Hono):** um helper do Next lê o cookie `workdeal_jwt` e monta o header `Authorization: Bearer` na request ao backend. O cookie é apenas armazenamento; na rede viaja o header.
- **Browser → API:** a regra da AGENTS.md (§2.3) é não haver fetch directo do browser à API Hono — mutações via Server Actions, dados via SSR/camada partilhada. Assim o JS nunca precisa de ler o JWT (permanece httpOnly). Se algum dia abrirmos fetch directo do browser, o token terá de ser exposto ao JS nesse ponto (ver questão aberta 5).
- **Consumidores externos** (mobile/parceiros B2B): enviam `Authorization: Bearer <jwt>` directamente.

**Verificação no Hono (`requireAuth`):**
- O `requireAuth` extrai o token do header `Authorization: Bearer <jwt>` (criado pelo helper do Next a partir do cookie `workdeal_jwt`, ou enviado directamente por consumidores externos) e **verifica o JWT localmente, de forma stateless**, com `jose` + a JWKS pública de `GET /api/auth/jwks` (cacheada). Valida assinatura (EdDSA), `iss`, `aud`, `exp` e presença de `sub`/`sessionId`.
- **Correcção (rev. 3):** o plugin `bearer` do better-auth **não** valida JWTs — aceita apenas o *session token* opaco (HMAC sobre o `secret`). A Fase 1 prevista (converter o JWT via `bearer` + `getSession`) não é possível. A verificação local com `jose`+JWKS passa de "optimização" a **mecanismo primário**. O plugin `bearer` mantém-se no config apenas para suportar *session tokens* opacos em consumidores externos (endpoints nativos `/api/auth/*`), não para a nossa API.
- Re-validar a sessão na BD (por `sessionId`) numa variante `requireLiveSession`, apenas em operações sensíveis (verificação de identidade, criação de eventos).

**Revogação:** logout apaga a sessão na BD (bloqueia refresh) e limpa o cookie `workdeal_jwt`. O JWT emitido permanece válido até `exp` (≤15m) — tradeoff aceite de JWTs curtos. Operações sensíveis (verificação de identidade, criação de eventos) re-validam a sessão na BD.

### 2.5 Montagem no Hono e endpoints

- better-auth montado como sub-app: `app.route("/api/auth", authHandler)`.
- Plugins activos: `organization`, `jwt`, `bearer` (+ `emailAndPassword` por omissão).
- Endpoints nativos relevantes: `/api/auth/sign-in/email`, `/sign-up/email`, `/sign-out`, `/get-session`, `/token`, `/jwks`, `/organization/*` (create, list, members, invitations).
- Rotas custom (registo inicial com criação de organização opcional, convite de membros, listagem de membros) em `apps/api/src/routes/auth.route.ts`, sobre a camada de service/repository de `packages/auth`.
- Prefixo global `/api/v1` para a nossa API; o bloco `/api/auth` fica fora do versionamento (client de auth é versionado pelo próprio better-auth).

### 2.6 Fluxos suportados na Fase 1

1. **Registo (individual)** — email + password (argon2id por omissão). Cria `user`; o perfil individual é criado no fluxo de onboarding.
2. **Registo (empresa)** — cria `user` + `organization` + `member(owner)` no mesmo fluxo.
3. **Login / logout** — email + password → sessão (cookie) + JWT (cookie `workdeal_jwt`). Logout revoga a sessão e limpa o cookie JWT.
4. **Refresh** — access token expirado (401) → `GET /api/auth/token` com cookie de sessão → novo JWT reescrito no cookie `workdeal_jwt`.
5. **Verificação de email** — obrigatória antes de criar empresa/eventos; email de verificação no registo.
6. **Reset de password** — email com link/token expirável.
7. **Convite de membros** — owner/admin convida por email; o convidado aceita (registo ou login) e recebe o papel proposto.
8. **Alteração de papel** — owner pode mudar papéis dos membros (nunca revogar o único owner sem transferência).

Fora de âmbito Fase 1: OAuth social, SMS/WhatsApp como login primário, MFA.

---

## 3. Modelo de dados (packages/db)

### 3.1 `user` (better-auth core + custom)

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| name | text | |
| email | text (unique) | |
| emailVerified | boolean | |
| image | text (null) | |
| createdAt / updatedAt | timestamp | |
| systemRole | enum `user`/`moderator`/`admin` | custom, default `user` |
| phone | text (null) | custom, contacto/WhatsApp |
| locale | text | custom, default `pt-MZ` |
| deletedAt | timestamp (null) | custom, soft delete |

### 3.2 `session` / `account` / `verification` (better-auth core)

Estrutura standard. `account.password` guarda o hash (provider `email`). `session` com `ipAddress`/`userAgent` para auditoria e `expiresAt` para o refresh/sliding.

### 3.3 `jwks` (plugin jwt)

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | `kid` do token |
| publicKey | text | PEM público |
| privateKey | text | PEM privado, encriptado em BD |
| createdAt / expiresAt | timestamp | rotação |

Config: EdDSA/Ed25519, rotação a cada 7 dias, grace period 30 dias. Nota (rev. 3): o modelo do plugin JWT em 1.6.26 é exactamente `id, publicKey, privateKey, createdAt, expiresAt` — **sem** `updatedAt`.

### 3.4 `organization` (plugin + custom)

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| name | text | |
| slug | text (unique) | URLs públicas |
| logo | text (null) | |
| metadata | text (JSON) | reservado ao plugin (nota rev. 3: `text`, não `jsonb` — o adapter do plugin serializa/parseia ele próprio) |
| createdAt / updatedAt | timestamp | `updatedAt` não é usado pelo plugin em 1.6.26; fica como coluna extra com default `now()` |
| verificationStatus | enum `pending`/`verified`/`in_review`/`suspended` | custom, default `pending` |
| verifiedAt | timestamp (null) | custom |

### 3.5 `member` (plugin)

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| organizationId | text (fk) | |
| userId | text (fk) | |
| role | enum `owner`/`admin`/`editor`/`member` | |
| createdAt | timestamp | sem `updatedAt` — o modelo do plugin (1.6.26) só tem `createdAt` |

Unique: `(organizationId, userId)`.

### 3.6 `invitation` (plugin)

| coluna | tipo | notas |
|---|---|---|
| id | text (pk) | |
| organizationId | text (fk) | |
| email | text | |
| role | enum | papel proposto |
| status | enum `pending`/`accepted`/`rejected`/`canceled` | |
| expiresAt | timestamp | |
| inviterId | text (fk) | |
| createdAt | timestamp | sem `updatedAt` — o modelo do plugin (1.6.26) só tem `createdAt` |

---

## 4. Matriz de permissões (packages/shared/permissions.ts)

### 4.1 System roles

| permissão | user | moderator | admin |
|---|---|---|---|
| Gerir próprio perfil / conta | ✓ | ✓ | ✓ |
| Rever fila de verificação | — | ✓ | ✓ |
| Moderar denúncias (perfis, tarefas, eventos, avaliações) | — | ✓ | ✓ |
| Gerir selos manuais | — | ✓ | ✓ |
| Gerir utilizadores e sistema | — | — | ✓ |

### 4.2 Org roles (permissões de domínio)

| permissão | owner | admin | editor | member |
|---|---|---|---|---|
| profile:edit | ✓ | ✓ | ✓ | — |
| profile:delete | ✓ | — | — | — |
| members:manage | ✓ | ✓ | — | — |
| tasks:manage | ✓ | ✓ | ✓ | — |
| events:manage | ✓ | ✓ | — | — |
| tasks:view | ✓ | ✓ | ✓ | ✓ |

Nativas de org (AC do plugin): criar membro, revogar convite, eliminar organização → apenas `owner`/`admin`.

### 4.3 Ownership (auto-gestão — profissional independente)

Aplicável quando `resource.userId === actor.id` (perfil individual, tarefas/avaliações próprias):

| permissão | dono do recurso |
|---|---|
| profile:edit | ✓ |
| profile:delete | ✓ |
| tasks:manage | ✓ |
| reviews:manage | ✓ |

Regras: ownership **nunca** sobrescreve o `systemRole` (um `user` não modera com o seu próprio perfil); moderador/admin podem agir sobre recursos alheios através do eixo systemRole.

### 4.4 Resolução

```
can(actor, resource, permission):
  1. systemRole concede? → allow
  2. resource é de organização? → member.role + ORG_PERMISSIONS
  3. resource é de utilizador (individual)? → ownership + SELF_PERMISSIONS
  4. senão → deny
```

---

## 5. Middlewares (apps/api/src/middlewares)

### 5.1 `requireAuth`
Lê o JWT do header `Authorization: Bearer <jwt>`; se ausente, tenta o cookie `workdeal_jwt` (chamadas server-side que o transportam). Verifica o JWT localmente (jose + JWKS cacheada — rev. 3) e injeta `user` (id, systemRole) e `sessionId` no context. Falha `AppError(401, "UNAUTHORIZED")`.

### 5.2 `requireSystemRole(...roles)`
Sobre `requireAuth`; verifica `user.systemRole`. Falha `AppError(403, "FORBIDDEN")`.

### 5.3 `requireOrgPermission(permission)`
Sobre `requireAuth`; resolve `organizationId` do param, carrega `member.role`, cruza com `ORG_PERMISSIONS`. Falha `AppError(403, "FORBIDDEN")`.

### 5.4 `requireOwnership(getOwnerId)`
Sobre `requireAuth`; compara `resource.userId` com `user.id`; permite se igual ou se `systemRole` (moderator/admin). Falha `AppError(403, "FORBIDDEN")`.

Ordem de aplicação: `requestId` → `logger` → `cors` → `rateLimit` → `requireAuth` → eixo RBAC/ownership → `zValidator` → handler. `onError` central no fim (AGENTS.md §6).

---

## 6. Segurança e anti-abuso

- **Rate limiting diferenciado**: registo, login, reset de password, convites — limites apertados; resto da API com limite geral.
- **Cookies**: `workdeal_jwt` (storage) e sessão (refresh) sempre `httpOnly`, `sameSite: lax`, `secure` em produção. O JWT em cookie httpOnly protege contra leitura por XSS (o JS nunca o vê); no HTTP o token viaja sempre no header `Authorization`, nunca no corpo/query.
- **Anti-CSRF**: como as chamadas de dados usam header `Authorization` (não enviado automaticamente pelo browser), o risco CSRF concentra-se nas rotas de auth que dependem de cookie (login/refresh) e nas mutações que reenviam o cookie server-side — proteger com header custom (`X-Requested-With`) e validação de `Origin`/`Referer` nessas rotas.
- **Verificação de email** obrigatória para acções de risco (criar empresa/eventos); contas não verificadas só lêem.
- **Chave JWT**: privada encriptada em BD (`jwks`), rotação automática, `kid` no header do token.
- **Nenhum segredo em código** — `packages/auth/lib/env.ts` valida `BETTER_AUTH_SECRET` (min 32), `BETTER_AUTH_URL`, `DATABASE_URL`, `ALLOWED_ORIGINS`.
- **CORS com origens explícitas**, nunca `*`.
- **Soft delete** em `user` — preserva histórico e FKs.
- **Logs estruturados** com `requestId` em eventos de auth (login falhado, mudança de papel, convites) para auditoria, sem hashes/passwords.

---

## 7. Variáveis de ambiente

| var | obrigatória | notas |
|---|---|---|
| DATABASE_URL | sim | Postgres (Drizzle) |
| BETTER_AUTH_SECRET | sim | min 32 chars |
| BETTER_AUTH_URL | sim | base URL pública da API |
| ALLOWED_ORIGINS | sim | lista separada por vírgulas |
| EMAIL_PROVIDER_API_KEY | fase 1 | envio de emails (verificação/reset) |

---

## 8. Alternativas consideradas e rejeitadas

| Alternativa | Motivo da rejeição |
|---|---|
| Auth0/Firebase Auth (gerido) | Custo/dependência externa; perder controlo do schema e multi-tenant em Moçambique (latência, dados). |
| Tabelas do better-auth por omissão | Perder fonte única de verdade no schema; campos custom via `metadata` menos auditáveis. |
| Refresh token também em JWT (auto-contido) | Revogação impossível sem estado; a sessão em BD do better-auth dá revogação + sliding. |
| Sessões opacas para tudo (sem JWT) | Não satisfaz o requisito de access tokens assinados para a API externa/stateless. |
| RBAC só no frontend | Rejeitado por princípio — autorização verificada sempre no backend/Server Actions. |

---

## 9. Questões em aberto

1. **Provedor de email** para verificação/reset em Moçambique (Resend, SES, Mailgun)? Decisão de infra, não bloqueia o desenho.
2. **Nome de negócio vs nome legal**: para empresas informais/semi-formais, `organization.name` pode diferir do `profile.name`. Confirmar se um só nome chega na Fase 1.
3. **Múltiplas organizações por utilizador** (`allowMultipleOrganizations`): recomendamos **on** — um profissional pode ser dono do seu perfil individual e membro de uma empresa, ou membro de mais de uma. Confirmar com o produto.
4. **Revogação de `owner`**: exigir transferência explícita (ou ≥2 owners) para a organização nunca ficar sem owner.
5. **Fetch directo do browser à API** (se um dia abrirmos, ex: mapa interactivo): como expor o JWT ao JS sem quebrar o modelo httpOnly? Opções em análise: janela curta via endpoint dedicado, cookie não-httpOnly com mitigação, ou proxy via Next (mantém o modelo actual — recomendado).

---

## 10. Próximos passos

1. ~~Criar `packages/db`~~ — feito (rev. 3): schema Drizzle das tabelas 3.1–3.6 (drizzle-orm 0.45.x) + client + `db:create` (script que cria a database `workdeal` se não existir, via `pnpm --filter @workdeal/db db:create`) + `db:generate`/`db:migrate`.
2. ~~Criar `packages/shared`~~ — feito (rev. 3): `permissions.ts` (matriz 4.x), schemas Zod de auth, `lib/env.ts` (validação de env partilhada).
3. ~~Criar `packages/auth`~~ — feito (rev. 3): `server.ts` (plugins organization + jwt + bearer, schema custom), `client.ts`, `cookies.ts`, `session.ts` (verificação JWT com jose), `repository.ts`.
4. ~~Criar `apps/api`~~ — feito (rev. 3): middlewares 5.x, `routes/auth.route.ts`, `onError` central + envelope `ok()/fail()`.
5. Decidir questões 1 e 3 para desbloquear implementação de emails e multi-org.
