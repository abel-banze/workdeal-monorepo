import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  env: {
    AI_PROVIDER: "mock",
    PAYMENT_CURRENCY: "MZN",
    AI_MAX_INPUT_TOKENS: 8000,
    AI_MAX_OUTPUT_TOKENS: 2000,
    AI_MAX_COST_USD: 0.05,
  },
  features: { requireFeature: vi.fn(), requireFeatureKeys: vi.fn() },
  usage: { insert: vi.fn() },
  tasks: { findById: vi.fn(), getUserProfileIds: vi.fn(), listByRequester: vi.fn(), listProposalsByProviders: vi.fn() },
  services: { listByProfile: vi.fn() },
  profiles: { findById: vi.fn(), findBySlug: vi.fn(), findByOrganizationId: vi.fn() },
  orgs: { findById: vi.fn() },
  portfolio: { listByProfile: vi.fn() },
  badges: { listActiveBadgeNames: vi.fn() },
  reviews: { avgRating: vi.fn() },
  locations: { listByProfile: vi.fn() },
  profilesService: { getPublicProfile: vi.fn() },
  aiSettings: { getRuntimeConfig: vi.fn() },
  getOrgRole: vi.fn(),
}));

vi.mock("../env.js", () => ({ env: mocks.env }));
vi.mock("./features.service.js", () => ({ featuresService: mocks.features }));
vi.mock("../repositories/agent-usage.repository.js", () => ({ agentUsageRepository: mocks.usage }));
vi.mock("../repositories/tasks.repository.js", () => ({ tasksRepository: mocks.tasks }));
vi.mock("../repositories/services.repository.js", () => ({ servicesRepository: mocks.services }));
vi.mock("../repositories/profiles.repository.js", () => ({ profilesRepository: mocks.profiles }));
vi.mock("../repositories/admin-organizations.repository.js", () => ({ adminOrganizationsRepository: mocks.orgs }));
vi.mock("../repositories/portfolio.repository.js", () => ({ portfolioRepository: mocks.portfolio }));
vi.mock("../repositories/badges.repository.js", () => ({ badgesRepository: mocks.badges }));
vi.mock("../repositories/reviews.repository.js", () => ({ reviewsRepository: mocks.reviews }));
vi.mock("../repositories/profile-location.repository.js", () => ({ profileLocationRepository: mocks.locations }));
vi.mock("./profiles.service.js", () => ({ profilesService: mocks.profilesService }));
vi.mock("./ai-settings.service.js", () => ({ aiSettingsService: mocks.aiSettings }));
vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));

import { agentsService } from "./agents.service.js";
import { AppError } from "../lib/errors.js";

const USER = { id: "u1", email: "c@x.mz", name: "Carla", systemRole: "user" as const, emailVerified: true, phone: null, locale: "pt-MZ", image: null };

const OPEN_TASK = {
  id: "task-1",
  title: "Reparação de canalização",
  description: "Preciso de alguém para reparar uma torneira com fuga.",
  requesterUserId: "u2",
  requesterOrganizationId: null,
  categoryId: null,
  priceMinMzn: 1000,
  priceMaxMzn: 5000,
  province: "Maputo",
  district: "KamPFumu",
  contractType: "service",
  dueAt: null,
  proposalDeadlineAt: null,
  status: "open",
  createdAt: new Date(),
  updatedAt: new Date(),
  attachments: [],
  address: null,
  latitude: null,
  longitude: null,
  tags: [{ id: "t1", slug: "canalizacao", name: "Canalização" }],
  requesterProfileName: "João",
  requesterProfileSlug: "joao",
  requesterProfileLogo: null,
};

const COMPANY_PROFILE_VIEW = {
  id: "prof-1",
  type: "company" as const,
  slug: "constructora-massinga",
  name: "Construções Massinga",
  tagline: "Construção civil",
  description: "Empresa moçambicana com 15 anos.",
  logoUrl: null,
  coverUrl: null,
  latitude: null,
  longitude: null,
  whatsapp: "258840000000",
  phone: null,
  email: "geral@massinga.co.mz",
  website: null,
  googlePlaceId: null,
  formattedAddress: null,
  businessHours: null,
  status: "active" as const,
  categories: [{ id: "c1", parentId: null, slug: "construcao", name: "Construção", description: null, isActive: true }],
  categoryIds: ["c1"],
  userId: null,
  organizationId: "org-1",
  location: { province: "Maputo", district: "Kampfumu", bairro: null, address: null, latitude: null, longitude: null, formattedAddress: null },
  qualification: { foundedYear: 2010, companySize: "media", workers: 20, legalForm: null, nuit: null, alvara: null },
  badges: [{ id: "b1", slug: "verified", name: "Verificado", description: null, type: "trust", status: "active", awardedAt: new Date("2024-01-01") }],
  reviews: { average: 4.5, count: 12 },
  services: [
    { id: "s1", title: "Construção de habitação", description: "Obras novas", priceMzn: 250000, imageUrl: null, categoryId: null },
  ],
  contactVerifications: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.env.AI_PROVIDER = "mock";
  mocks.features.requireFeature.mockResolvedValue(undefined as never);
  mocks.features.requireFeatureKeys.mockResolvedValue(undefined as never);
  mocks.tasks.getUserProfileIds.mockResolvedValue(["prof-1"]);
  mocks.tasks.listByRequester.mockResolvedValue({ total: 2, items: [] });
  mocks.tasks.listProposalsByProviders.mockResolvedValue({ total: 3, items: [] });
  mocks.profiles.findByOrganizationId.mockResolvedValue(null);
  mocks.orgs.findById.mockResolvedValue(null);
  mocks.portfolio.listByProfile.mockResolvedValue([]);
  mocks.badges.listActiveBadgeNames.mockResolvedValue([]);
  mocks.reviews.avgRating.mockResolvedValue({ avg: 0, count: 0 });
  mocks.locations.listByProfile.mockResolvedValue([]);
  mocks.profiles.findBySlug.mockResolvedValue({ id: "prof-1", status: "active", organizationId: "org-1" });
  mocks.profilesService.getPublicProfile.mockResolvedValue(COMPANY_PROFILE_VIEW as never);
  mocks.aiSettings.getRuntimeConfig.mockResolvedValue({
    activeProvider: mocks.env.AI_PROVIDER,
    apiKeyOf: () => undefined,
    modelOf: () => "mock-model",
    budgets: {
      maxInputTokens: mocks.env.AI_MAX_INPUT_TOKENS,
      maxOutputTokens: mocks.env.AI_MAX_OUTPUT_TOKENS,
      maxCostUsd: mocks.env.AI_MAX_COST_USD,
    },
  } as never);
});

describe("chatAssistant", () => {
  it("em modo mock devolve resposta determinística sem tocar no motor", async () => {
    const res = await agentsService.chatAssistant(USER, { message: "Quais as minhas ofertas?", organizationId: null });
    expect(res.reply).toContain("Quais as minhas ofertas?");
    expect(res.reply).not.toContain("[modo demo");
    expect(res.demo).toBe(true);
    expect(mocks.features.requireFeature).toHaveBeenCalledWith({ userId: "u1", organizationId: null }, "ai_assistant");
    expect(mocks.usage.insert).not.toHaveBeenCalled();
  });

  it("aceita histórico de conversa", async () => {
    const res = await agentsService.chatAssistant(USER, {
      message: "e depois?",
      organizationId: null,
      history: [
        { role: "user", text: "primeira" },
        { role: "assistant", text: "resposta" },
      ],
    });
    expect(res.demo).toBe(true);
    expect(res.reply).toContain("e depois?");
  });

  it("em modo mock faz stream da resposta em pedaços sem metering", async () => {
    const { deltas, completion } = await agentsService.chatAssistantStream(USER, { message: "olá", organizationId: null });
    const parts: string[] = [];
    for await (const delta of deltas) parts.push(delta);
    const result = await completion;
    expect(parts.join("")).toContain("olá");
    expect(result.demo).toBe(true);
    expect(result.status).toBe("ok");
    expect(mocks.usage.insert).not.toHaveBeenCalled();
  });

  it("exige feature antes de responder", async () => {
    mocks.features.requireFeature.mockRejectedValue(new AppError(403, "FEATURE_REQUIRED", "não disponível"));
    await expect(agentsService.chatAssistant(USER, { message: "olá", organizationId: null })).rejects.toMatchObject({ code: "FEATURE_REQUIRED" });
  });

  it("rejeita organização de que não é membro", async () => {
    mocks.getOrgRole.mockResolvedValue(null);
    await expect(agentsService.chatAssistant(USER, { message: "olá", organizationId: "org-x" })).rejects.toMatchObject({ code: "NOT_MEMBER" });
  });

  it("preenche o contexto da organização no mock sem metering", async () => {
    mocks.getOrgRole.mockResolvedValue("owner");
    mocks.orgs.findById.mockResolvedValue({ name: "Massinga Lda" });
    mocks.profiles.findByOrganizationId.mockResolvedValue({ name: "Construções Massinga", tagline: "Construção civil", description: "Empresa moçambicana." });
    const res = await agentsService.chatAssistant(USER, { message: "olá", organizationId: "org-1" });
    expect(res.reply).toContain("Massinga Lda");
    expect(res.demo).toBe(true);
    expect(mocks.usage.insert).not.toHaveBeenCalled();
  });

  it("responde mesmo quando o enriquecimento falha", async () => {
    mocks.tasks.listByRequester.mockRejectedValue(new Error("db down"));
    mocks.tasks.listProposalsByProviders.mockRejectedValue(new Error("db down"));
    const res = await agentsService.chatAssistant(USER, { message: "olá", organizationId: null });
    expect(res.demo).toBe(true);
    expect(res.reply).toContain("a sua organização");
  });
});

describe("draftProposal", () => {
  it("gera rascunho (mock) com contexto da tarefa e do perfil", async () => {
    mocks.tasks.findById.mockResolvedValue(OPEN_TASK);
    mocks.services.listByProfile.mockResolvedValue([{ title: "Canalização" }]);
    mocks.profiles.findById.mockResolvedValue({ name: "Carla Reparos" });

    const res = await agentsService.draftProposal(USER, { taskId: "task-1", providerProfileId: "prof-1", organizationId: null });

    expect(mocks.features.requireFeature).toHaveBeenCalledWith({ userId: "u1", organizationId: null }, "ai_proposal_generation");
    expect(res.message).toContain("Reparação de canalização");
    expect(res.message).toContain("Carla Reparos");
    expect(res.demo).toBe(true);
  });

  it("rejeita tarefa inexistente", async () => {
    mocks.tasks.findById.mockResolvedValue(null);
    await expect(agentsService.draftProposal(USER, { taskId: "x", providerProfileId: "prof-1", organizationId: null })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
  });

  it("rejeita tarefa fechada", async () => {
    mocks.tasks.findById.mockResolvedValue({ ...OPEN_TASK, status: "completed" });
    await expect(agentsService.draftProposal(USER, { taskId: "task-1", providerProfileId: "prof-1", organizationId: null })).rejects.toMatchObject({ code: "TASK_CLOSED" });
  });

  it("rejeita perfil que não pertence ao utilizador", async () => {
    mocks.tasks.findById.mockResolvedValue(OPEN_TASK);
    mocks.tasks.getUserProfileIds.mockResolvedValue(["prof-outro"]);
    await expect(agentsService.draftProposal(USER, { taskId: "task-1", providerProfileId: "prof-1", organizationId: null })).rejects.toMatchObject({ code: "PROFILE_REQUIRED" });
  });

  it("enriquece o perfil do fornecedor (portefólio, selos, avaliação, cidade)", async () => {
    mocks.tasks.findById.mockResolvedValue(OPEN_TASK);
    mocks.services.listByProfile.mockResolvedValue([{ title: "Canalização" }]);
    mocks.profiles.findById.mockResolvedValue({ name: "Carla Reparos" });
    mocks.portfolio.listByProfile.mockResolvedValue([{ title: "Obra X" }, { title: "Obra Y" }]);
    mocks.badges.listActiveBadgeNames.mockResolvedValue(["Verificado"]);
    mocks.reviews.avgRating.mockResolvedValue({ avg: 4.6, count: 8 });
    mocks.locations.listByProfile.mockResolvedValue([{ isPrimary: true, district: "Kampfumu", province: "Maputo" }]);

    const res = await agentsService.draftProposal(USER, { taskId: "task-1", providerProfileId: "prof-1", organizationId: null });

    expect(mocks.portfolio.listByProfile).toHaveBeenCalledWith("prof-1");
    expect(mocks.badges.listActiveBadgeNames).toHaveBeenCalledWith("prof-1");
    expect(mocks.reviews.avgRating).toHaveBeenCalledWith("prof-1");
    expect(mocks.locations.listByProfile).toHaveBeenCalledWith("prof-1");
    expect(res.demo).toBe(true);
  });

  it("gera rascunho mesmo quando o enriquecimento falha", async () => {
    mocks.tasks.findById.mockResolvedValue(OPEN_TASK);
    mocks.services.listByProfile.mockResolvedValue([{ title: "Canalização" }]);
    mocks.profiles.findById.mockResolvedValue({ name: "Carla Reparos" });
    mocks.portfolio.listByProfile.mockRejectedValue(new Error("db down"));
    mocks.badges.listActiveBadgeNames.mockRejectedValue(new Error("db down"));
    mocks.reviews.avgRating.mockRejectedValue(new Error("db down"));
    mocks.locations.listByProfile.mockRejectedValue(new Error("db down"));

    const res = await agentsService.draftProposal(USER, { taskId: "task-1", providerProfileId: "prof-1", organizationId: null });

    expect(res.message).toContain("Reparação de canalização");
    expect(res.demo).toBe(true);
  });
});

describe("draftResponse", () => {
  it("gera rascunho de resposta (mock)", async () => {
    const res = await agentsService.draftResponse(USER, { contextType: "quote", subject: "Pedido de orçamento para pintura", detail: "Quero pintar 3 divisões.", organizationId: null });
    expect(mocks.features.requireFeature).toHaveBeenCalledWith({ userId: "u1", organizationId: null }, "ai_response_support");
    expect(res.message).toContain("Pedido de orçamento para pintura");
    expect(res.demo).toBe(true);
  });

  it("enriquece com nome e serviços do perfil da organização", async () => {
    mocks.getOrgRole.mockResolvedValue("owner");
    mocks.profiles.findByOrganizationId.mockResolvedValue({ id: "prof-1", name: "Construções Massinga" });
    mocks.services.listByProfile.mockResolvedValue([{ title: "Pintura" }, { title: "Canalização" }]);

    const res = await agentsService.draftResponse(USER, { contextType: "quote", subject: "Pedido de orçamento para pintura", organizationId: "org-1" });

    expect(mocks.services.listByProfile).toHaveBeenCalledWith("prof-1");
    expect(res.message).toContain("Construções Massinga");
    expect(res.demo).toBe(true);
  });

  it("gera rascunho mesmo quando o enriquecimento falha", async () => {
    mocks.getOrgRole.mockResolvedValue("owner");
    mocks.profiles.findByOrganizationId.mockRejectedValue(new Error("db down"));

    const res = await agentsService.draftResponse(USER, { contextType: "contact", subject: "Contacto geral", organizationId: "org-1" });

    expect(res.message).toContain("Contacto geral");
    expect(res.demo).toBe(true);
  });
});

describe("chatWithProfileAssistant", () => {
  it("devolve resposta determinística em modo mock sem metering", async () => {
    const res = await agentsService.chatWithProfileAssistant(USER, "constructora-massinga", "Quanto custa construir?");
    expect(mocks.features.requireFeatureKeys).toHaveBeenCalledWith({ userId: "u1", organizationId: "org-1" }, ["ai_assistant", "ai_profile_assistant"], { strategy: "any" });
    expect(res.suggest).toBe("quote");
    expect(res.reply).not.toContain("[modo demo");
    expect(res.demo).toBe(true);
    expect(mocks.usage.insert).not.toHaveBeenCalled();
  });

  it("rejeita perfil inexistente/inactivo", async () => {
    mocks.profiles.findBySlug.mockResolvedValue(null);
    await expect(agentsService.chatWithProfileAssistant(USER, "nao-existe", "olá")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejeita perfil individual (sem organização) — feature não aplicável", async () => {
    mocks.profiles.findBySlug.mockResolvedValue({ id: "prof-i", status: "active", organizationId: null });
    await expect(agentsService.chatWithProfileAssistant(USER, "individual", "olá")).rejects.toMatchObject({ code: "FEATURE_REQUIRED" });
  });

  it("exige feature da organização dona do perfil", async () => {
    mocks.features.requireFeatureKeys.mockRejectedValue(new AppError(403, "FEATURE_REQUIRED", "não disponível"));
    await expect(agentsService.chatWithProfileAssistant(USER, "constructora-massinga", "olá")).rejects.toMatchObject({ code: "FEATURE_REQUIRED" });
  });
});