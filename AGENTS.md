# AGENTS.md — Workdeal

Guia de boas práticas para desenvolvimento (humano ou agente de IA) no projecto Workdeal. Este documento é a referência a seguir ao gerar ou rever código neste repositório — prioriza estas convenções sobre padrões genéricos.

---

## 0. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (App Router, **SSR-first**) |
| Backend | Hono |
| Autenticação | better-auth (com plugin de organizações para RBAC) |
| ORM | Drizzle |
| Base de dados | PostgreSQL |
| Validação | Zod |
| Infra | Docker / Coolify |

---

## 1. Arquitectura Geral

Estrutura recomendada (monorepo):

```
workdeal/
├── apps/
│   ├── web/          # Next.js (frontend, SSR-first)
│   └── api/           # Hono (backend API)
├── packages/
│   ├── db/             # Schema Drizzle + client Postgres, migrações
│   ├── auth/           # Configuração better-auth partilhada (server + client)
│   ├── shared/         # Tipos, schemas Zod, constantes partilhadas entre web e api
│   └── ui/             # Componentes de UI partilhados (design system)
└── AGENTS.md
```

**Regra base:** nenhuma lógica de negócio (regras de selos, cálculo de distância, permissões) deve viver duplicada em `web` e `api`. Se é usado nos dois lados, vai para `packages/shared`.

---

## 2. Frontend — Next.js (SSR-first)

### 2.1 Princípio central
Por defeito, **tudo é Server Component**. Só se usa `"use client"` no componente folha que realmente precisa de interactividade (formulário, dropdown, mapa interactivo). Nunca marcar um layout ou uma página inteira como client só porque um botão lá dentro precisa de `onClick`.

```tsx
// app/(directory)/profiles/[slug]/page.tsx — Server Component (sem "use client")
export default async function ProfilePage({ params }: { params: { slug: string } }) {
  const profile = await getProfileBySlug(params.slug); // fetch directo no servidor
  return (
    <div>
      <ProfileHeader profile={profile} />
      <ContactButton profileId={profile.id} /> {/* este sim, "use client" */}
    </div>
  );
}
```

### 2.2 Data fetching
- Fazer fetch de dados **directamente nos Server Components**, com `fetch()` ou chamada directa à camada de dados (via `packages/shared`/API interna), nunca `useEffect` + `useState` para carregar dados iniciais.
- Usar `cache`/`revalidate`/`tags` do Next.js para controlar frescura dos dados:
  - Directório de perfis, categorias: `revalidate` longo (ex: 1h) + `revalidateTag` quando um perfil é editado.
  - Pesquisa "nearby", disponibilidade de tarefas: `no-store` ou `revalidate: 0` (dados voláteis).
  - Página de concurso público: `revalidate` curto (ex: 5-10 min), alinhado à cadência do scraper.

### 2.3 Mutações → Server Actions
**Regra confirmada:** toda a mutação passa sempre por uma Server Action, mesmo quando existe endpoint equivalente na API Hono — a Action chama a lógica partilhada (`packages/shared`/services) e fica reutilizável por qualquer página ou componente, em vez de se reescrever a chamada em cada sítio. A API Hono existe para consumidores externos ao Next (mobile, parceiros B2B, integrações) — nunca é o frontend a chamá-la directamente via `fetch` do browser.

```tsx
// app/actions/tasks.ts
"use server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

const createTaskSchema = z.object({
  categoryId: z.string(),
  description: z.string().min(10),
});

export async function createTask(input: z.infer<typeof createTaskSchema>) {
  const session = await requireAuth();
  const data = createTaskSchema.parse(input);
  // ... persistir via camada de dados partilhada
}
```

### 2.4 Streaming e Suspense
Secções lentas (avaliações, feed de actividade, resultados nearby) devem ser envolvidas em `<Suspense>` com fallback, para não bloquear o TTFB da página inteira:

```tsx
<Suspense fallback={<ReviewsSkeleton />}>
  <ProfileReviews profileId={profile.id} />
</Suspense>
```

### 2.5 Convenções de ficheiros (App Router)
- `loading.tsx` e `error.tsx` obrigatórios em qualquer rota com fetch assíncrono relevante (directório, perfil, tarefas, eventos).
- `not-found.tsx` para perfis/tarefas/eventos inexistentes ou não publicados.
- `generateMetadata` em todas as páginas públicas indexáveis (perfil, categoria, evento, concurso) — título, descrição, Open Graph, JSON-LD estruturado.
- Usar sempre `next/image` para imagens de perfil/portfólio (nunca `<img>` simples).

### 2.6 Estrutura de pastas dentro de `apps/web`
```
app/
  (directory)/          # rotas públicas: perfis, categorias, pesquisa
  (opportunities)/      # eventos, tarefas, concursos
  (dashboard)/           # área autenticada de gestão de perfil/organização
  actions/               # Server Actions agrupadas por domínio
components/
  ui/                    # componentes de design system (sem lógica de negócio)
  features/              # componentes específicos de domínio (ex: TaskCard, BadgeList)
lib/                     # helpers client-safe
```

---

## 3. Backend — Hono (escalável)

### 3.1 Estrutura em camadas
route → controller → service → repository é a estrutura recomendada por omissão. Não é uma regra rígida: em rotas simples (ex: um `GET` directo sem lógica de negócio), usar bom senso e simplificar — o objectivo é evitar lógica de negócio implícita e não-testável dentro do handler HTTP, não forçar 4 ficheiros para tudo.

```
apps/api/src/
  routes/
    profiles.route.ts
    tasks.route.ts
  controllers/
    profiles.controller.ts
  services/
    profiles.service.ts       # regras de negócio (ex: cálculo de selos)
  repositories/
    profiles.repository.ts    # única camada que fala com Drizzle
  middlewares/
  lib/
  index.ts                     # composição da app Hono
```

- **Routes**: só definem o caminho, método, middlewares aplicados e chamam o controller.
- **Controllers**: extraem/validam input (via Zod), chamam o service, formatam a resposta.
- **Services**: lógica de negócio pura, testável sem HTTP nem base de dados directa.
- **Repositories**: única camada com queries Drizzle — services nunca importam o client Drizzle directamente.

### 3.2 Validação
Toda a entrada (body, query, params) é validada com Zod antes de chegar ao controller, usando `@hono/zod-validator`:

```ts
// routes/tasks.route.ts
import { zValidator } from "@hono/zod-validator";
import { createTaskSchema } from "@workdeal/shared/schemas/task";

app.post("/tasks", requireAuth, zValidator("json", createTaskSchema), tasksController.create);
```

Os schemas Zod vivem em `packages/shared` para serem reutilizados no frontend (Server Actions) e no backend — **uma única fonte de verdade** por entidade.

### 3.3 Resposta consistente
Toda a API responde num envelope consistente, para o frontend tratar erros de forma previsível:

```ts
// lib/api-response.ts
export const ok = <T>(data: T, meta?: Record<string, unknown>) => ({ success: true, data, meta });
export const fail = (code: string, message: string, details?: unknown) => ({
  success: false, error: { code, message, details },
});
```

### 3.4 Tratamento de erros centralizado
`AppError` tipado + `onError` central é o padrão recomendado. Não é obrigatório em absolutamente todos os casos: usar bom senso — um `try/catch` localizado é aceitável para lidar com uma falha externa muito específica (ex: timeout de uma API de terceiros) desde que ainda converta o erro para `AppError` antes de o propagar, mantendo o formato de resposta consistente.

```ts
// lib/errors.ts
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// index.ts
app.onError((err, c) => {
  if (err instanceof AppError) {
    return c.json(fail(err.code, err.message), err.status);
  }
  console.error(err); // ligar a logger estruturado
  return c.json(fail("INTERNAL_ERROR", "Erro interno"), 500);
});
```

### 3.5 Versionamento e organização de rotas
- Prefixo `/api/v1` desde o início — evita breaking changes não controlados quando a API crescer (mobile, parceiros B2B).
- Agrupar rotas por domínio: `/api/v1/profiles`, `/api/v1/tasks`, `/api/v1/events`, `/api/v1/tenders`.

### 3.6 Performance e escalabilidade
- Handlers devem ser **stateless** — nada de estado em memória entre pedidos (importante se correr em múltiplas réplicas atrás do Coolify/Docker Swarm).
- Operações lentas ou agendadas (alertas de concursos, notificações, cálculo periódico de selos automáticos) **não correm dentro do request/response** — vão para workers/jobs separados (fila dedicada), nunca bloqueando um endpoint HTTP.
- Paginação obrigatória em qualquer listagem (perfis, tarefas, eventos, concursos) — nunca devolver uma lista completa sem `limit`/`cursor`.
- Índices geoespaciais (PostGIS) para queries "nearby" — nunca calcular distância em memória depois de trazer todos os registos da BD.

### 3.7 Testes
- Services (lógica de negócio) têm cobertura de testes unitários independente de HTTP e de BD real (repositórios mockados).
- Endpoints críticos (auth, criação de tarefa, submissão de proposta) têm pelo menos um teste de integração.

---

## 4. Autenticação e RBAC (better-auth)

### 4.1 Modelo de papéis
Dois níveis de controlo de acesso:

1. **Papel de sistema** (por utilizador): `user`, `moderator`, `admin` — usado para o painel administrativo interno.
2. **Papel de organização** (por perfil de empresa, via plugin de organizações do better-auth): `owner`, `admin`, `editor`, `member` — controla quem pode editar/publicar em nome de um perfil de empresa.

```ts
// packages/shared/permissions.ts
export const ORG_PERMISSIONS = {
  owner:  ["profile:edit", "profile:delete", "members:manage", "tasks:manage", "events:manage"],
  admin:  ["profile:edit", "members:manage", "tasks:manage", "events:manage"],
  editor: ["profile:edit", "tasks:manage"],
  member: ["tasks:view"],
} as const;
```

### 4.2 Middleware de autenticação (Hono)
```ts
// middlewares/auth.middleware.ts
import { createMiddleware } from "hono/factory";
import { auth } from "@workdeal/auth";
import { AppError } from "../lib/errors";

export const requireAuth = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) throw new AppError(401, "UNAUTHORIZED", "Sessão inválida ou expirada");
  c.set("session", session);
  await next();
});
```

### 4.3 Middleware de RBAC
```ts
// middlewares/rbac.middleware.ts
export const requireOrgPermission = (permission: string) =>
  createMiddleware(async (c, next) => {
    const session = c.get("session");
    const orgId = c.req.param("organizationId");
    const role = await getOrgRole(session.user.id, orgId); // via repository
    if (!role || !ORG_PERMISSIONS[role].includes(permission)) {
      throw new AppError(403, "FORBIDDEN", "Sem permissão para esta acção");
    }
    await next();
  });

// uso:
app.put(
  "/organizations/:organizationId/profile",
  requireAuth,
  requireOrgPermission("profile:edit"),
  profilesController.update,
);
```

### 4.4 Papel de sistema (admin/moderador — painel interno)
```ts
export const requireSystemRole = (...roles: Array<"admin" | "moderator">) =>
  createMiddleware(async (c, next) => {
    const session = c.get("session");
    if (!roles.includes(session.user.systemRole)) {
      throw new AppError(403, "FORBIDDEN", "Acesso restrito à equipa Workdeal");
    }
    await next();
  });

app.post("/admin/verifications/:id/approve", requireAuth, requireSystemRole("admin", "moderator"), verificationsController.approve);
```

### 4.5 Protecção no frontend (Next.js)
- Nunca confiar só na UI para esconder acções (ex: esconder botão "editar") — **toda a autorização real acontece no backend/Server Action**, a UI só reflecte o estado para melhor UX.
- Layouts de área autenticada (`app/(dashboard)/layout.tsx`) fazem `redirect()` no servidor se não houver sessão, antes de renderizar qualquer filho.
- Server Actions repetem a verificação de permissão (nunca assumir que, por a UI só mostrar o botão a quem tem permissão, a Action está protegida por si só).

---

## 5. Helpers (packages/shared + apps/api/lib)

| Helper | Responsabilidade |
|---|---|
| `lib/api-response.ts` | Envelope `ok()`/`fail()` consistente (secção 3.3) |
| `lib/geo.ts` | Cálculo/normalização de distância, bounding box para pesquisa nearby |
| `lib/dates.ts` | Formatação de datas/prazos (concursos, eventos) em `pt-MZ` |
| `lib/env.ts` | Validação de variáveis de ambiente com Zod no arranque da app (falhar cedo se faltar uma env var) |
| `lib/logger.ts` | Logger estruturado (nível, contexto, `requestId`) partilhado entre middlewares e services |
| `permissions.ts` | Matriz de permissões RBAC (secção 4.1), única fonte de verdade usada por middlewares e pela UI para desenhar o estado (não para autorizar) |

```ts
// lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  WHATSAPP_API_TOKEN: z.string().optional(),
});

export const env = envSchema.parse(process.env); // lança erro no arranque se inválido
```

---

## 6. Middlewares (Hono) — inventário

Aplicados na app Hono, por ordem recomendada:

1. **`requestId`** — gera/propaga um ID único por pedido, usado nos logs.
2. **`logger`** — regista método, rota, duração, status (usar o `requestId`).
3. **`cors`** — origens permitidas explícitas (nunca `*` em produção).
4. **`rateLimit`** — limites diferenciados por rota sensível (ex: criação de tarefas/eventos, submissão de propostas, endpoints públicos de pesquisa).
5. **`requireAuth`** — só nas rotas autenticadas (secção 4.2).
6. **`requireOrgPermission` / `requireSystemRole`** — só onde há acção sobre um recurso específico (secção 4.3-4.4).
7. **`zValidator`** — validação de input por rota (secção 3.2).
8. **`onError`** — não é bem um middleware de cadeia, mas o handler central de erro (secção 3.4), sempre no fim da composição.

```ts
// index.ts
const app = new Hono();

app.use("*", requestId());
app.use("*", logger());
app.use("*", cors({ origin: env.ALLOWED_ORIGINS.split(",") }));
app.use("/api/*", rateLimit({ window: "1m", max: 100 }));

app.route("/api/v1/profiles", profilesRoute);
app.route("/api/v1/tasks", tasksRoute);
app.route("/api/v1/admin", adminRoute); // rotas internas já com requireSystemRole aplicado dentro

app.onError(errorHandler);
```

---

## 7. Convenções Gerais

- **Nomenclatura em inglês em todo o código:** ficheiros em `kebab-case`, componentes React em `PascalCase`, funções/variáveis em `camelCase`, tabelas Drizzle em `snake_case` — tudo em inglês, mesmo os nomes de domínio (`profile`, `task`, `tender`, não `perfil`, `tarefa`, `concurso`). Só o conteúdo visível ao utilizador final (textos de UI, mensagens de erro, labels) fica em português (Moçambique).
- **Nunca confiar em input do cliente** — mesmo com validação no frontend, o backend valida sempre de novo (secção 3.2).
- **Nenhum segredo/credencial no código** — tudo via `env.ts` validado (secção 5).
- **Toda a query geoespacial ou de listagem passa pela camada de repository** — nunca escrever SQL/Drizzle directamente em componentes Next.js ou controllers.
- **Commits pequenos e descritivos**, alinhados a um domínio (ex: `feat(tasks): adicionar fluxo de propostas`).
- **Idioma do produto:** português (Moçambique) — textos visíveis ao utilizador, mensagens de erro e labels em `pt-MZ`; nomes de variáveis/código em inglês, como é convenção técnica.

---

## 8. Checklist rápido para gerar/rever código

- [ ] O componente Next.js é Server Component por defeito? `"use client"` só onde é indispensável?
- [ ] A mutação passa por Server Action ou endpoint Hono — nunca lógica de negócio directa num handler de UI?
- [ ] O input é validado com Zod (schema partilhado de `packages/shared`) tanto no frontend como no backend?
- [ ] A rota Hono segue route → controller → service → repository, sem lógica de negócio no handler?
- [ ] A autorização (RBAC) é verificada no backend, não só escondida na UI?
- [ ] Listagens têm paginação e queries nearby usam índice geoespacial?
- [ ] Erros lançados são `AppError` tipados, tratados pelo `onError` central — sem `try/catch` genérico espalhado?
- [ ] Segue as convenções de nomenclatura e não introduz segredos hardcoded?