import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type { FeatureKey } from "@workdeal/shared";
import { featuresService, type FeatureScope } from "../services/features.service.js";
import { AppError } from "../lib/errors.js";
import type { Env } from "./auth.middleware.js";

export interface RequireFeatureOptions {
  /** Nome do param de rota com o organizationId (default: "organizationId"). */
  organizationIdParam?: string;
  /** Usar query `?organizationId=` mesmo que a rota não tenha param. */
  query?: boolean;
  /**
   * Header a ler para o organizationId (ex: pedidos de integrações).
   * Tem prioridade sobre param de rota.
   */
  header?: string;
  /** Mensagem de erro customizada (pt-MZ). */
  message?: string;
  /** Permite âmbito sem organização → usa a subscrição pessoal do user. */
  allowPersonal?: boolean;
  /** Restrói o org de uma variável de contexto (resolver tem prioridade). */
  resolver?: (c: Context<Env>) => string | null | undefined;
}

export interface RequireAnyFeatureOptions {
  organizationIdParam?: string;
  header?: string;
  allowPersonal?: boolean;
  resolver?: (c: Context<Env>) => string | null | undefined;
}

type MiddlewareContext = Context<Env>;

function resolveOrganizationId(
  c: MiddlewareContext,
  opts: {
    organizationIdParam?: string;
    query?: boolean;
    header?: string;
    resolver?: (c: MiddlewareContext) => string | null | undefined;
  },
): { organizationId: string | null } {
  if (opts.resolver) {
    const resolved = opts.resolver(c);
    if (resolved) return { organizationId: resolved };
  }
  if (opts.header) {
    const fromHeader = c.req.header(opts.header);
    if (fromHeader) return { organizationId: fromHeader };
  }
  const param = c.req.param(opts.organizationIdParam ?? "organizationId");
  if (param) return { organizationId: param };
  if (opts.query || opts.organizationIdParam) {
    const fromQuery = c.req.query(opts.organizationIdParam ?? "organizationId");
    if (fromQuery) return { organizationId: fromQuery };
  }
  return { organizationId: null };
}

/**
 * Gate de feature por âmbito (fail-closed).
 *
 * O âmbito é a organização em:
 *   1. (máx.) resolver definido em `resolver` (variáveis de contexto);
 *   2. header `opts.header`;
 *   3. param de rota `:organizationId` (ou `opts.organizationIdParam`);
 *   4. query `?organizationId=` (se `opts.query`);
 *   5. (fallback) subscrição pessoal do utilizador, se `allowPersonal`.
 *
 * Se não houver organização E o âmbito pessoal estiver desactivado → 403
 * (nunca existe gate "vazio" por omissão). Sempre que a org não concede a
 * feature, responde 403 FEATURE_REQUIRED com detalhes estruturados.
 *
 * ```
 * app.post("/quotes", requireAuth, requireFeature("ai_assistant"), quotesController.create);
 * app.put("/organizations/:organizationId/menu", requireAuth, requireFeature("ai_assistant"), ...);
 * ```
 */
export const requireFeature = (key: FeatureKey, opts: RequireFeatureOptions = {}) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    const { organizationId } = resolveOrganizationId(c, {
      organizationIdParam: opts.organizationIdParam,
      query: opts.query,
      header: opts.header,
      resolver: opts.resolver,
    });

    if (!organizationId && !opts.allowPersonal) {
      throw new AppError(403, "ORGANIZATION_REQUIRED", "Esta funcionalidade exige uma organização");
    }

    await featuresService.requireFeature({ userId: user.id, organizationId }, key, opts.message);
    await next();
  });

/**
 * Exige PELO MENOS UMA das features indicadas (ex: posso editar com
 * `ai_assistant` OU `premium_tools`). O âmbito é resolvido como em
 * `requireFeature`.
 */
export const requireAnyFeature = (keys: FeatureKey[], opts: RequireAnyFeatureOptions = {}) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    const { organizationId } = resolveOrganizationId(c, {
      organizationIdParam: opts.organizationIdParam,
      header: opts.header,
      resolver: opts.resolver,
    });

    if (!organizationId && !opts.allowPersonal) {
      throw new AppError(403, "ORGANIZATION_REQUIRED", "Esta funcionalidade exige uma organização");
    }

    await featuresService.requireFeatureKeys({ userId: user.id, organizationId }, keys, { strategy: "any" });
    await next();
  });

/**
 * Exige TODAS as features indicadas. Útil para acções que dependem de vários
 * pacotes (ex: exportar PDF exige `analytics_visits_contacts` E `documents`).
 */
export const requireAllFeatures = (keys: FeatureKey[], opts: RequireAnyFeatureOptions = {}) =>
  createMiddleware<Env>(async (c, next) => {
    const user = c.get("user");
    const { organizationId } = resolveOrganizationId(c, {
      organizationIdParam: opts.organizationIdParam,
      header: opts.header,
      resolver: opts.resolver,
    });

    if (!organizationId && !opts.allowPersonal) {
      throw new AppError(403, "ORGANIZATION_REQUIRED", "Esta funcionalidade exige uma organização");
    }

    await featuresService.requireFeatureKeys({ userId: user.id, organizationId }, keys, { strategy: "all" });
    await next();
  });

export type { FeatureScope };