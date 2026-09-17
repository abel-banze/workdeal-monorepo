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
  responseMessageSchema,
  profileAssistantReplySchema,
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

// ── Assistente comercial (chat) ───────────────────────────────────────────

export const chatAssistant = async (user: AuthUser, input: AssistantChatInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_assistant");

  const runtime = await getRuntime();
  const context: AssistantContext = {
    providerId: runtime.activeProvider,
    organizationName: null,
    profileSummary: null,
    activitySummary: null,
    currency: env.PAYMENT_CURRENCY,
  };

  const history: AgentMessage[] = input.history ?? [];

  if (context.providerId === "mock") {
    return { reply: mockAssistantReply(context, input.message), demo: true };
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
  const context: AssistantContext = {
    providerId: runtime.activeProvider,
    organizationName: null,
    profileSummary: null,
    activitySummary: null,
    currency: env.PAYMENT_CURRENCY,
  };
  const history: AgentMessage[] = input.history ?? [];

  if (context.providerId === "mock") {
    const reply = mockAssistantReply(context, input.message);
    return { deltas: chunkText(reply), completion: Promise.resolve({ ...mockResult(reply), demo: true }) };
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
      portfolioHighlights: [],
      badges: [],
      averageRating: null,
      cities: [],
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
  const result = await finalizeRun("Não consegui gerar a proposta. Tente novamente.", {
    organizationId,
    userId: user.id,
    agentKey: AGENTS.proposalWriter.key,
    agent: "proposalWriter",
    providerId: ctx.providerId,
    result: await runAgent(model, {
      providerId: ctx.providerId,
      model: runtime.modelOf(ctx.providerId, AGENTS.proposalWriter.tier),
      tier: AGENTS.proposalWriter.tier,
      system: buildProposalSystemPrompt(ctx),
      user: buildProposalUserPrompt(ctx),
      temperature: AGENTS.proposalWriter.temperature,
      maxInputTokens: runtime.budgets.maxInputTokens,
      maxOutputTokens: AGENTS.proposalWriter.maxOutputTokens,
      maxCostUsd: runtime.budgets.maxCostUsd,
      output: structuredOutput(proposalMessageSchema),
    }),
  });

  const parsed = proposalMessageSchema.safeParse(result.output);
  if (!parsed.success) {
    logger.warn("agentes: proposta fora do schema", { userId: user.id });
    throw new AppError(502, "AI_GENERATION_FAILED", "Não consegui gerar a proposta. Tente novamente.");
  }
  return { ...parsed.data, demo: false };
};

// ── Apoio à preparação de respostas (rascunho) ──────────────────────────

export const draftResponse = async (user: AuthUser, input: ResponseDraftInput) => {
  const organizationId = input.organizationId ?? null;
  await assertOrgMembership(user, organizationId);
  await featuresService.requireFeature({ userId: user.id, organizationId }, "ai_response_support");

  const runtime = await getRuntime();

  const ctx: ResponseSupportContext = {
    providerId: runtime.activeProvider,
    contextType: input.contextType,
    fromName: input.fromName ?? null,
    fromOrganization: input.fromOrganization ?? null,
    subject: input.subject,
    detail: input.detail ?? null,
    provider: { name: user.name, services: [] },
    currency: env.PAYMENT_CURRENCY,
  };

  if (ctx.providerId === "mock") {
    return { ...mockResponseMessage(ctx), demo: true };
  }

  const model = createModel(ctx.providerId, AGENTS.responseSupport.tier, {
    modelId: runtime.modelOf(ctx.providerId, AGENTS.responseSupport.tier),
    apiKey: runtime.apiKeyOf(ctx.providerId),
  });
  const result = await finalizeRun("Não consegui gerar a resposta. Tente novamente.", {
    organizationId,
    userId: user.id,
    agentKey: AGENTS.responseSupport.key,
    agent: "responseSupport",
    providerId: ctx.providerId,
    result: await runAgent(model, {
      providerId: ctx.providerId,
      model: runtime.modelOf(ctx.providerId, AGENTS.responseSupport.tier),
      tier: AGENTS.responseSupport.tier,
      system: buildResponseSystemPrompt(ctx),
      user: buildResponseUserPrompt(ctx),
      temperature: AGENTS.responseSupport.temperature,
      maxInputTokens: runtime.budgets.maxInputTokens,
      maxOutputTokens: AGENTS.responseSupport.maxOutputTokens,
      maxCostUsd: runtime.budgets.maxCostUsd,
      output: structuredOutput(responseMessageSchema),
    }),
  });

  const parsed = responseMessageSchema.safeParse(result.output);
  if (!parsed.success) {
    logger.warn("agentes: resposta fora do schema", { userId: user.id });
    throw new AppError(502, "AI_GENERATION_FAILED", "Não consegui gerar a resposta. Tente novamente.");
  }
  return { ...parsed.data, demo: false };
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
  const result = await finalizeRun("Não consegui gerar a resposta. Tente novamente.", {
    organizationId,
    userId: user.id,
    agentKey: AGENTS.profileAssistant.key,
    agent: "profileAssistant",
    providerId: ctx.providerId,
    result: await runAgent(model, {
      providerId: ctx.providerId,
      model: runtime.modelOf(ctx.providerId, AGENTS.profileAssistant.tier),
      tier: AGENTS.profileAssistant.tier,
      system: buildProfileAssistantSystemPrompt(ctx),
      user: buildProfileAssistantUserPrompt(ctx, message),
      history,
      temperature: AGENTS.profileAssistant.temperature,
      maxInputTokens: runtime.budgets.maxInputTokens,
      maxOutputTokens: AGENTS.profileAssistant.maxOutputTokens,
      maxCostUsd: runtime.budgets.maxCostUsd,
      output: structuredOutput(profileAssistantReplySchema),
    }),
  });

  const parsed = profileAssistantReplySchema.safeParse(result.output);
  if (!parsed.success) {
    logger.warn("agentes: resposta do assistente de perfil fora do schema", { userId: user.id, slug });
    throw new AppError(502, "AI_GENERATION_FAILED", "Não consegui gerar a resposta. Tente novamente.");
  }
  return { ...parsed.data, demo: false };
};

export const agentsService = { chatAssistant, chatAssistantStream, draftProposal, draftResponse, chatWithProfileAssistant };