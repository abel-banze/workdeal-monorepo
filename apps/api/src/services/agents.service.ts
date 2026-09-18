import type { z } from "zod";
import type { AuthUser, AssistantChatInput, ProposalDraftInput, ResponseDraftInput } from "@workdeal/shared";
import {
  AGENTS,
  createModel,
  structuredOutput,
  mockAssistantReply,
  mockProposalMessage,
  mockResponseMessage,
  mockProfileAssistantReply,
  mockResult,
  proposalMessageSchema,
  type ProposalMessage,
  responseMessageSchema,
  type ResponseMessage,
  profileAssistantReplySchema,
  type ProfileAssistantReply,
  buildAssistantSystemPrompt,
  buildAssistantUserPrompt,
  buildProposalSystemPrompt,
  buildProposalUserPrompt,
  buildResponseSystemPrompt,
  buildResponseUserPrompt,
  buildProfileAssistantSystemPrompt,
  buildProfileAssistantUserPrompt,
  runAgent,
  streamAgent,
  buildStructuredRetryUserPrompt,
  validateProposalContent,
  type AgentMessage,
  type AgentRunResult,
  type AssistantContext,
  type ProposalWriterContext,
  type ResponseSupportContext,
  type ProfileAssistantContext,
} from "@workdeal/agents";
import { getOrgRole } from "@workdeal/auth";
import { AppError } from "../lib/errors.js";
import { logger } from "@workdeal/shared/lib/logger";
import { featuresService } from "./features.service.js";
import { buildAssistantTools } from "./agent-tools.js";
import { agentUsageRepository } from "../repositories/agent-usage.repository.js";
import { tasksRepository } from "../repositories/tasks.repository.js";
import { servicesRepository } from "../repositories/services.repository.js";
import { profilesRepository } from "../repositories/profiles.repository.js";
import { adminOrganizationsRepository } from "../repositories/admin-organizations.repository.js";
import { portfolioRepository } from "../repositories/portfolio.repository.js";
import { badgesRepository } from "../repositories/badges.repository.js";
import { reviewsRepository } from "../repositories/reviews.repository.js";
import { profileLocationRepository } from "../repositories/profile-location.repository.js";
import { conversationsRepository } from "../repositories/conversations.repository.js";
import {
  buildConversationKey,
  mergeHistories,
  formatTurnsForSummary,
  summarizeFallback,
  CONVERSATION_MAX_TURNS,
  CONVERSATION_KEEP_RECENT,
  type MemoryScope,
} from "./conversation-memory.js";
import { profilesService } from "./profiles.service.js";
import { aiSettingsService, type AiRuntimeConfig } from "./ai-settings.service.js";
import { env } from "../env.js";

type AiProvider = "mock" | "google" | "anthropic" | "openai";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Config de runtime do motor (provider activo, modelos, budgets, chaves) — TTL 30s no service. */
function getRuntime(): Promise<AiRuntimeConfig> {
  return aiSettingsService.getRuntimeConfig();
}

async function assertOrgMembership(user: AuthUser, organizationId: string | null) {
  if (!organizationId) return;
  const role = await getOrgRole(user.id, organizationId);
  if (!role) throw new AppError(403, "NOT_MEMBER", "Não pertence a esta organização");
}

async function assertProfileOwnership(user: AuthUser, profileId: string) {
  const ids = await tasksRepository.getUserProfileIds(user.id);
  if (!ids.includes(profileId)) {
    throw new AppError(403, "PROFILE_REQUIRED", "Perfil do fornecedor não pertence ao utilizador");
  }
}

/** Registra metering e rejeita a resposta se o run não for `ok`. */
async function finalizeRun(fallbackMessage: string, usage: {
  organizationId: string | null;
  userId: string;
  agentKey: string;
  agent: "assistant" | "proposalWriter" | "responseSupport" | "profileAssistant";
  providerId: AiProvider;
  result: Awaited<ReturnType<typeof runAgent>>;
}) {
  const { result, providerId: p, agentKey, organizationId, userId } = usage;
  await agentUsageRepository.insert({
    organizationId,
    userId,
    agentKey,
    provider: p,
    model: result.model,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    estimatedCostUsd: result.usage.estimatedCostUsd,
    durationMs: result.durationMs,
    status: result.status,
    errorCode: result.errorCode,
  });
  if (result.status !== "ok") {
    logger.warn(`agentes: ${agentKey} falhou`, { runStatus: result.status, errorCode: result.errorCode, userId });
    throw new AppError(502, "AI_GENERATION_FAILED", fallbackMessage);
  }
  return result;
}

/**
 * Contexto da organização para o assistente — melhor esforço: qualquer falha
 * de enriquecimento devolve `null` nesse campo em vez de quebrar o chat.
 */
async function buildAssistantOrgContext(user: AuthUser, organizationId: string | null): Promise<AssistantContext> {
  const context: AssistantContext = {
    providerId: "mock",
    organizationName: null,
    profileSummary: null,
    activitySummary: null,
    currency: env.PAYMENT_CURRENCY,
  };
  try {
    if (organizationId) {
      const [orgRow, profileRow] = await Promise.all([
        adminOrganizationsRepository.findById(organizationId).catch(() => null),
        profilesRepository.findByOrganizationId(organizationId).catch(() => null),
      ]);
      context.organizationName = orgRow?.name ?? profileRow?.name ?? null;
      if (profileRow) {
        const bits = [profileRow.name, profileRow.tagline ?? null, profileRow.description?.slice(0, 200) ?? null].filter(Boolean);
        context.profileSummary = bits.length > 0 ? bits.join(" — ") : null;
      }
    }
    const profileIds = await tasksRepository.getUserProfileIds(user.id).catch(() => [] as string[]);
    const [open, sent] = await Promise.all([
      tasksRepository.listByRequester(user.id, "open", 1, 1).catch(() => ({ total: 0 })),
      tasksRepository.listProposalsByProviders(profileIds, undefined, 1, 1).catch(() => ({ total: 0 })),
    ]);
    context.activitySummary = `${open.total} tarefa(s) aberta(s); ${sent.total} proposta(s) enviada(s)`;
  } catch {
    // Enriquecimento é opcional — o chat funciona com o que houver.
  }
  return context;
}

/**
 * Corre um agent de output estruturado com UMA segunda tentativa: se o output
 * falhar o schema (ou a `validate` opcional), reenvia com o motivo da
 * rejeição em vez de devolver 502 directo. Na segunda falha de schema, 502;
 * se só a validação de conteúdo falhar, aceita com aviso (melhor esforço).
 */
async function runStructuredWithRetry<T>(args: {
  agentKey: string;
  organizationId: string | null;
  userId: string;
  agent: "assistant" | "proposalWriter" | "responseSupport" | "profileAssistant";
  providerId: AiProvider;
  schema: z.ZodType<T>;
  schemaName: string;
  run: (feedback: string | null) => Promise<AgentRunResult>;
  validate?: (data: T) => string[];
  fallbackMessage: string;
}): Promise<T> {
  const meter = (result: AgentRunResult) =>
    finalizeRun(args.fallbackMessage, {
      organizationId: args.organizationId,
      userId: args.userId,
      agentKey: args.agentKey,
      agent: args.agent,
      providerId: args.providerId,
      result,
    });

  const first = await meter(await args.run(null));
  const parsed = args.schema.safeParse(first.output);
  const contentIssues = parsed.success && args.validate ? args.validate(parsed.data) : [];
  if (parsed.success && contentIssues.length === 0) return parsed.data;

  const feedback = !parsed.success
    ? parsed.error.issues.map((i) => `${i.path.join(".") || args.schemaName}: ${i.message}`).join("; ")
    : contentIssues.join("; ");
  const second = await meter(await args.run(feedback));
  const reparsed = args.schema.safeParse(second.output);
  if (!reparsed.success) {
    logger.warn(`agentes: ${args.schemaName} fora do schema após retry`, { userId: args.userId });
    throw new AppError(502, "AI_GENERATION_FAILED", args.fallbackMessage);
  }
  if (args.validate) {
    const remaining = args.validate(reparsed.data);
    if (remaining.length > 0) {
      logger.warn(`agentes: ${args.schemaName} aceite com ressalvas`, { issues: remaining, userId: args.userId });
    }
  }
  return reparsed.data;
}

// ── Memória de conversa (por utilizador) ──────────────────────────────────

interface LoadedMemory {
  conversation: { id: string; summary: string | null };
  history: AgentMessage[];
}

/**
 * Carrega a conversa do âmbito (cria se não existir) e junta o histórico
 * guardado (fonte de verdade) com o enviado pelo cliente. Melhor esforço:
 * devolve `null` se a BD falhar — o chat funciona sem memória.
 */
async function loadMemory(user: AuthUser, scope: Omit<MemoryScope, "userId">, clientHistory: AgentMessage[] | undefined): Promise<LoadedMemory | null> {
  try {
    const key = buildConversationKey({ ...scope, userId: user.id });
    const conversation = await conversationsRepository.findOrCreate({
      key,
      userId: user.id,
      organizationId: scope.organizationId,
      agentKey: AGENTS[scope.agent].key,
      profileId: scope.profileId,
    });
    const stored = await conversationsRepository.listRecentTurns(conversation.id, CONVERSATION_MAX_TURNS);
    return {
      conversation,
      history: mergeHistories(
        stored.map((t) => ({ role: (t.role === "assistant" ? "assistant" : "user") as "user" | "assistant", text: t.text })),
        clientHistory,
      ),
    };
  } catch (err) {
    logger.warn("agentes: memória indisponível, a continuar sem histórico", { userId: user.id });
    return null;
  }
}

/**
 * Persiste o turno (pergunta + resposta) e resume os mais antigos quando o
 * total passa o teto — tudo melhor esforço, nunca quebra o chat.
 */
async function persistMemoryTurns(args: {
  memory: LoadedMemory | null;
  userId: string;
  messageText: string;
  replyText: string;
  summarizeReal: (previous: string | null, turns: AgentMessage[]) => Promise<string>;
}): Promise<void> {
  if (!args.memory) return;
  try {
    const { conversation } = args.memory;
    await conversationsRepository.appendTurn(conversation.id, "user", args.messageText);
    await conversationsRepository.appendTurn(conversation.id, "assistant", args.replyText);
    const total = await conversationsRepository.countTurns(conversation.id);
    if (total <= CONVERSATION_MAX_TURNS) return;
    const all = await conversationsRepository.listRecentTurns(conversation.id, total);
    const oldest = all
      .slice(0, total - CONVERSATION_KEEP_RECENT)
      .map((t) => ({ role: (t.role === "assistant" ? "assistant" : "user") as "user" | "assistant", text: t.text }));
    let summary: string;
    try {
      summary = await args.summarizeReal(conversation.summary, oldest);
    } catch (err) {
      logger.warn("agentes: resumidor falhou, extractivo de recurso", { userId: args.userId });
      summary = summarizeFallback(conversation.summary, oldest);
    }
    await conversationsRepository.setSummary(conversation.id, summary);
    await conversationsRepository.deleteOldest(conversation.id, CONVERSATION_KEEP_RECENT);
  } catch (err) {
    logger.warn("agentes: persistência de memória falhou", { userId: args.userId });
  }
}

/** Resume turnos antigos com o modelo `flash` (barato); falha → recurso extractivo no chamador. */
async function summarizeTurnsWithModel(args: {
  providerId: AiProvider;
  runtime: AiRuntimeConfig;
  turns: AgentMessage[];
  previous: string | null;
  organizationId: string | null;
  userId: string;
  agentKey: string;
}): Promise<string> {
  const model = createModel(args.providerId, "flash", {
    modelId: args.runtime.modelOf(args.providerId, "flash"),
    apiKey: args.runtime.apiKeyOf(args.providerId),
  });
  const result = await runAgent(model, {
    providerId: args.providerId,
    model: args.runtime.modelOf(args.providerId, "flash"),
    tier: "flash",
    system: "És um resumidor de conversas da Workdeal. Resume em português de Moçambique, 3-5 frases curtas: factos (nomes, valores, prazos), pedidos e decisões do utilizador. Sem opiniões.",
    user: `${args.previous ? `Resumo anterior: ${args.previous}\n\n` : ""}Turnos a resumir:\n${formatTurnsForSummary(args.turns)}`,
    maxInputTokens: 4000,
    maxOutputTokens: 400,
    maxCostUsd: 0.01,
  });
  try {
    await agentUsageRepository.insert({
      organizationId: args.organizationId,
      userId: args.userId,
      agentKey: args.agentKey,
      provider: args.providerId,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      durationMs: result.durationMs,
      status: result.status,
      errorCode: result.errorCode,
    });
  } catch {
    // Metering do resumo é acessório — nunca quebra o chat.
  }
  if (result.status !== "ok" || !result.text.trim()) throw new Error("Summarizer run failed");
  return result.text.trim().slice(0, 1000);
}

// ── Assistente comercial (chat) ───────────────────────────────────────────

export const chatAssistant = async (user: AuthUser, input: AssistantChatInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_assistant");

  const runtime = await getRuntime();
  const context: AssistantContext = await buildAssistantOrgContext(user, organizationId);
  context.providerId = runtime.activeProvider;

  const memory = await loadMemory(user, { agent: "assistant", organizationId, profileId: null }, input.history);
  const history: AgentMessage[] = memory?.history ?? input.history ?? [];
  context.conversationSummary = memory?.conversation.summary ?? null;

  const summarizeReal = (previous: string | null, turns: AgentMessage[]): Promise<string> => {
    if (context.providerId === "mock") return Promise.resolve(summarizeFallback(previous, turns));
    return summarizeTurnsWithModel({
      providerId: context.providerId,
      runtime,
      turns,
      previous,
      organizationId,
      userId: user.id,
      agentKey: AGENTS.assistant.key,
    });
  };
  const persist = (replyText: string) =>
    persistMemoryTurns({ memory, userId: user.id, messageText: input.message, replyText, summarizeReal });

  if (context.providerId === "mock") {
    const reply = mockAssistantReply(context, input.message);
    await persist(reply);
    return { reply, demo: true };
  }

  const model = createModel(context.providerId, AGENTS.assistant.tier, {
    modelId: runtime.modelOf(context.providerId, AGENTS.assistant.tier),
    apiKey: runtime.apiKeyOf(context.providerId),
  });
  const result = await finalizeRun("Não consegui gerar a resposta. Tente novamente.", {
    organizationId,
    userId: user.id,
    agentKey: AGENTS.assistant.key,
    agent: "assistant",
    providerId: context.providerId,
    result: await runAgent(model, {
      providerId: context.providerId,
      model: runtime.modelOf(context.providerId, AGENTS.assistant.tier),
      tier: AGENTS.assistant.tier,
      system: buildAssistantSystemPrompt(context),
      user: buildAssistantUserPrompt(context, input.message),
      history,
      temperature: AGENTS.assistant.temperature,
      maxInputTokens: runtime.budgets.maxInputTokens,
      maxOutputTokens: AGENTS.assistant.maxOutputTokens,
      maxCostUsd: runtime.budgets.maxCostUsd,
      tools: buildAssistantTools({ user, organizationId }),
      maxSteps: AGENTS.assistant.maxSteps ?? 5,
    }),
  });

  await persist(result.text);
  return { reply: result.text, demo: false };
};

/** Texto em pedaços para o stream em modo `mock` (sem metering, como o chat mock). */
async function* chunkText(text: string, size = 32): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size);
}

// ── Assistente comercial em streaming (SSE) ───────────────────────────────

export const chatAssistantStream = async (user: AuthUser, input: AssistantChatInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_assistant");

  const runtime = await getRuntime();
  const context: AssistantContext = await buildAssistantOrgContext(user, organizationId);
  context.providerId = runtime.activeProvider;

  const memory = await loadMemory(user, { agent: "assistant", organizationId, profileId: null }, input.history);
  const history: AgentMessage[] = memory?.history ?? input.history ?? [];
  context.conversationSummary = memory?.conversation.summary ?? null;

  const summarizeReal = (previous: string | null, turns: AgentMessage[]): Promise<string> => {
    if (context.providerId === "mock") return Promise.resolve(summarizeFallback(previous, turns));
    return summarizeTurnsWithModel({
      providerId: context.providerId,
      runtime,
      turns,
      previous,
      organizationId,
      userId: user.id,
      agentKey: AGENTS.assistant.key,
    });
  };
  const persist = (replyText: string) =>
    persistMemoryTurns({ memory, userId: user.id, messageText: input.message, replyText, summarizeReal });

  if (context.providerId === "mock") {
    const reply = mockAssistantReply(context, input.message);
    const completion = Promise.resolve({ ...mockResult(reply), demo: true }).then(async (r) => {
      await persist(reply);
      return r;
    });
    return { deltas: chunkText(reply), completion };
  }

  const model = createModel(context.providerId, AGENTS.assistant.tier, {
    modelId: runtime.modelOf(context.providerId, AGENTS.assistant.tier),
    apiKey: runtime.apiKeyOf(context.providerId),
  });
  const handle = await streamAgent(model, {
    providerId: context.providerId,
    model: runtime.modelOf(context.providerId, AGENTS.assistant.tier),
    tier: AGENTS.assistant.tier,
    system: buildAssistantSystemPrompt(context),
    user: buildAssistantUserPrompt(context, input.message),
    history,
    temperature: AGENTS.assistant.temperature,
    maxInputTokens: runtime.budgets.maxInputTokens,
    maxOutputTokens: AGENTS.assistant.maxOutputTokens,
    maxCostUsd: runtime.budgets.maxCostUsd,
    tools: buildAssistantTools({ user, organizationId }),
    maxSteps: AGENTS.assistant.maxSteps ?? 5,
  });

  // Metering regista sempre (ok ou falha); a falha não lança aqui porque os
  // headers do SSE já seguiram — o controller emite um evento `error`.
  const record = async (result: AgentRunResult) => {
    await agentUsageRepository.insert({
      organizationId,
      userId: user.id,
      agentKey: AGENTS.assistant.key,
      provider: context.providerId,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      durationMs: result.durationMs,
      status: result.status,
      errorCode: result.errorCode,
    });
    if (result.status !== "ok") {
      logger.warn("agentes: ai_assistant (stream) falhou", { runStatus: result.status, errorCode: result.errorCode, userId: user.id });
    } else {
      await persist(result.text);
    }
    return { ...result, demo: false };
  };

  return { deltas: handle.deltas, completion: handle.completion.then(record) };
};

// ── Geração de proposta (rascunho) ───────────────────────────────────────

export const draftProposal = async (user: AuthUser, input: ProposalDraftInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_proposal_generation");

  const taskRow = await tasksRepository.findById(input.taskId);
  if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
  if (taskRow.status !== "open" && taskRow.status !== "in_review") {
    throw new AppError(409, "TASK_CLOSED", "Tarefa não está a aceitar propostas");
  }
  await assertProfileOwnership(user, input.providerProfileId);

  const [services, profileRow] = await Promise.all([
    servicesRepository.listByProfile(input.providerProfileId),
    profilesRepository.findById(input.providerProfileId),
  ]);

  // Perfil do fornecedor — melhor esforço: sem estes dados a proposta sai
  // genérica; qualquer falha mantém os valores vazios anteriores.
  const [portfolioHighlights, badgeNames, averageRating, cities] = await Promise.all([
    portfolioRepository
      .listByProfile(input.providerProfileId)
      .then((rows) => (rows ?? []).map((r) => r.title).filter(Boolean).slice(0, 5))
      .catch(() => [] as string[]),
    badgesRepository.listActiveBadgeNames(input.providerProfileId).catch(() => [] as string[]),
    reviewsRepository
      .avgRating(input.providerProfileId)
      .then((r) => (r && r.count > 0 ? Math.round(r.avg * 10) / 10 : null))
      .catch(() => null as number | null),
    profileLocationRepository
      .listByProfile(input.providerProfileId)
      .then((rows) => {
        const loc = (rows ?? []).find((r) => r.isPrimary) ?? (rows ?? [])[0] ?? null;
        if (!loc) return [] as string[];
        const label = [loc.district, loc.province].filter(Boolean).join(" · ");
        return label ? [label] : ([] as string[]);
      })
      .catch(() => [] as string[]),
  ]);

  const runtime = await getRuntime();

  const ctx: ProposalWriterContext = {
    providerId: runtime.activeProvider,
    task: {
      id: taskRow.id,
      title: taskRow.title,
      description: taskRow.description,
      category: null,
      tags: (taskRow as { tags?: Array<{ name: string }> }).tags?.map((t) => t.name) ?? [],
      priceMinMzn: taskRow.priceMinMzn,
      priceMaxMzn: taskRow.priceMaxMzn,
      province: taskRow.province,
      district: taskRow.district,
      contractType: taskRow.contractType,
      dueAt: taskRow.dueAt ? new Date(taskRow.dueAt).toISOString() : null,
      proposalDeadlineAt: taskRow.proposalDeadlineAt ? new Date(taskRow.proposalDeadlineAt).toISOString() : null,
    },
    provider: {
      name: profileRow?.name ?? user.name,
      services: services.map((s) => s.title),
      portfolioHighlights,
      badges: badgeNames,
      averageRating,
      cities,
    },
    priceMzn: input.priceMzn ?? null,
    estimatedDays: input.estimatedDays ?? null,
    currency: env.PAYMENT_CURRENCY,
  };

  if (ctx.providerId === "mock") {
    return { ...mockProposalMessage(ctx), demo: true };
  }

  const model = createModel(ctx.providerId, AGENTS.proposalWriter.tier, {
    modelId: runtime.modelOf(ctx.providerId, AGENTS.proposalWriter.tier),
    apiKey: runtime.apiKeyOf(ctx.providerId),
  });
  const baseUserPrompt = buildProposalUserPrompt(ctx);
  const data = await runStructuredWithRetry<ProposalMessage>({
    agentKey: AGENTS.proposalWriter.key,
    organizationId,
    userId: user.id,
    agent: "proposalWriter",
    providerId: ctx.providerId,
    schema: proposalMessageSchema,
    schemaName: "proposta",
    run: (feedback) =>
      runAgent(model, {
        providerId: ctx.providerId,
        model: runtime.modelOf(ctx.providerId, AGENTS.proposalWriter.tier),
        tier: AGENTS.proposalWriter.tier,
        system: buildProposalSystemPrompt(ctx),
        user: feedback ? buildStructuredRetryUserPrompt(baseUserPrompt, feedback) : baseUserPrompt,
        temperature: AGENTS.proposalWriter.temperature,
        maxInputTokens: runtime.budgets.maxInputTokens,
        maxOutputTokens: AGENTS.proposalWriter.maxOutputTokens,
        maxCostUsd: runtime.budgets.maxCostUsd,
        output: structuredOutput(proposalMessageSchema),
      }),
    validate: (d) => validateProposalContent(d.message, { priceMzn: ctx.priceMzn, estimatedDays: ctx.estimatedDays }),
    fallbackMessage: "Não consegui gerar a proposta. Tente novamente.",
  });
  return { ...data, demo: false };
};

// ── Apoio à preparação de respostas (rascunho) ──────────────────────────

export const draftResponse = async (user: AuthUser, input: ResponseDraftInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_response_support");

  // Serviços do fornecedor — melhor esforço: sem isto a resposta sai
  // genérica; qualquer falha mantém o comportamento anterior.
  let providerName = user.name;
  let providerServices: string[] = [];
  if (organizationId) {
    try {
      const profile = await profilesRepository.findByOrganizationId(organizationId).catch(() => null);
      if (profile) {
        providerName = profile.name ?? user.name;
        const rows = await servicesRepository.listByProfile(profile.id).catch(() => []);
        providerServices = (rows ?? []).map((s) => s.title).filter(Boolean).slice(0, 8);
      }
    } catch {
      // Enriquecimento é opcional — o rascunho funciona com o que houver.
    }
  }

  const runtime = await getRuntime();

  const ctx: ResponseSupportContext = {
    providerId: runtime.activeProvider,
    contextType: input.contextType,
    fromName: input.fromName ?? null,
    fromOrganization: input.fromOrganization ?? null,
    subject: input.subject,
    detail: input.detail ?? null,
    provider: { name: providerName, services: providerServices },
    currency: env.PAYMENT_CURRENCY,
  };

  if (ctx.providerId === "mock") {
    return { ...mockResponseMessage(ctx), demo: true };
  }

  const model = createModel(ctx.providerId, AGENTS.responseSupport.tier, {
    modelId: runtime.modelOf(ctx.providerId, AGENTS.responseSupport.tier),
    apiKey: runtime.apiKeyOf(ctx.providerId),
  });
  const baseUserPrompt = buildResponseUserPrompt(ctx);
  const data = await runStructuredWithRetry<ResponseMessage>({
    agentKey: AGENTS.responseSupport.key,
    organizationId,
    userId: user.id,
    agent: "responseSupport",
    providerId: ctx.providerId,
    schema: responseMessageSchema,
    schemaName: "resposta",
    run: (feedback) =>
      runAgent(model, {
        providerId: ctx.providerId,
        model: runtime.modelOf(ctx.providerId, AGENTS.responseSupport.tier),
        tier: AGENTS.responseSupport.tier,
        system: buildResponseSystemPrompt(ctx),
        user: feedback ? buildStructuredRetryUserPrompt(baseUserPrompt, feedback) : baseUserPrompt,
        temperature: AGENTS.responseSupport.temperature,
        maxInputTokens: runtime.budgets.maxInputTokens,
        maxOutputTokens: AGENTS.responseSupport.maxOutputTokens,
        maxCostUsd: runtime.budgets.maxCostUsd,
        output: structuredOutput(responseMessageSchema),
      }),
    fallbackMessage: "Não consegui gerar a resposta. Tente novamente.",
  });
  return { ...data, demo: false };
};

// ── Assistente de perfil público (visitante autenticado) ────────────────

export const chatWithProfileAssistant = async (user: AuthUser, slug: string, message: string, history: AgentMessage[] = []) => {
  // 1. Resolve a organização dona do perfil (publicProfile não expõe orgId).
  const profileRow = await profilesRepository.findBySlug(slug);
  if (!profileRow || profileRow.status !== "active") {
    throw new AppError(404, "NOT_FOUND", "Perfil não encontrado");
  }
  const organizationId = profileRow.organizationId;
  if (!organizationId) {
    throw new AppError(403, "FEATURE_REQUIRED", "O assistente de IA está disponível apenas para perfis de empresa");
  }

  // 2. Gate no plano da organização dona do perfil (visitor não precisa de membership).
  // Aceita a feature nova (`ai_profile_assistant`) ou a anterior (`ai_assistant`)
  // para não quebrar planos concedidos antes da separação.
  await featuresService.requireFeatureKeys({ userId: user.id, organizationId }, ["ai_assistant", "ai_profile_assistant"], { strategy: "any" });

  // 3. Contexto público do perfil para o prompt.
  const view = await profilesService.getPublicProfile(slug);
  const loc = view.location;
  const runtime = await getRuntime();
  const ctx: ProfileAssistantContext = {
    providerId: runtime.activeProvider,
    company: {
      name: view.name,
      tagline: view.tagline,
      description: view.description,
      location: [loc?.district, loc?.province].filter(Boolean).join(" · ") || null,
      foundedYear: view.qualification?.foundedYear ?? null,
      companySize: view.qualification?.companySize ?? null,
      categories: view.categories.map((c) => c.name),
      badges: view.badges.map((b) => b.name),
      reviews: view.reviews,
      services: view.services,
      contact: { whatsapp: view.whatsapp, phone: view.phone, email: view.email, website: view.website },
    },
    currency: env.PAYMENT_CURRENCY,
  };

  if (ctx.providerId === "mock") {
    return { ...mockProfileAssistantReply(ctx, message), demo: true };
  }

  const model = createModel(ctx.providerId, AGENTS.profileAssistant.tier, {
    modelId: runtime.modelOf(ctx.providerId, AGENTS.profileAssistant.tier),
    apiKey: runtime.apiKeyOf(ctx.providerId),
  });
  const baseUserPrompt = buildProfileAssistantUserPrompt(ctx, message);
  const data = await runStructuredWithRetry<ProfileAssistantReply>({
    agentKey: AGENTS.profileAssistant.key,
    organizationId,
    userId: user.id,
    agent: "profileAssistant",
    providerId: ctx.providerId,
    schema: profileAssistantReplySchema,
    schemaName: "resposta do assistente de perfil",
    run: (feedback) =>
      runAgent(model, {
        providerId: ctx.providerId,
        model: runtime.modelOf(ctx.providerId, AGENTS.profileAssistant.tier),
        tier: AGENTS.profileAssistant.tier,
        system: buildProfileAssistantSystemPrompt(ctx),
        user: feedback ? buildStructuredRetryUserPrompt(baseUserPrompt, feedback) : baseUserPrompt,
        history,
        temperature: AGENTS.profileAssistant.temperature,
        maxInputTokens: runtime.budgets.maxInputTokens,
        maxOutputTokens: AGENTS.profileAssistant.maxOutputTokens,
        maxCostUsd: runtime.budgets.maxCostUsd,
        output: structuredOutput(profileAssistantReplySchema),
      }),
    fallbackMessage: "Não consegui gerar a resposta. Tente novamente.",
  });
  return { ...data, demo: false };
};

export const agentsService = { chatAssistant, chatAssistantStream, draftProposal, draftResponse, chatWithProfileAssistant };