import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks modulares — o service usa imports dinâmicos fire-and-forget
// (email de boas-vindas + refresh MV) que não devem correr nos testes.
const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  repo: {
    complete: vi.fn(),
    findOrganizationProfile: vi.fn(),
    slugExists: vi.fn(),
  },
  sendWelcomeCompanyEmail: vi.fn(),
  dbExecute: vi.fn(),
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/onboarding.repository.js", () => ({ onboardingRepository: mocks.repo }));
vi.mock("../services/email.service.js", () => ({ sendWelcomeCompanyEmail: mocks.sendWelcomeCompanyEmail }));
vi.mock("@workdeal/db", () => ({ db: { execute: mocks.dbExecute } }));

import { onboardingService } from "./onboarding.service.js";
import { AppError } from "../lib/errors.js";
import type { AuthUser } from "@workdeal/shared";

const user = { id: "u1", name: "Ana Mondlane", email: "ana@codebaz.co.mz" } as unknown as AuthUser;

const WA_VERIFIED = { channel: "whatsapp" as const, identifier: "258821234567" };

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    organizationId: "org-1",
    profile: {
      name: "Construções XYZ",
      categoryIds: ["cat-1"],
      whatsapp: "+258 82 123 4567",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOrgRole.mockResolvedValue("owner");
  mocks.repo.findOrganizationProfile.mockResolvedValue(null);
  mocks.repo.slugExists.mockResolvedValue(false);
  mocks.repo.complete.mockResolvedValue({ profileId: "p1", created: true });
  mocks.sendWelcomeCompanyEmail.mockResolvedValue(undefined);
  mocks.dbExecute.mockResolvedValue(undefined);
});

describe("onboardingService.complete — RBAC", () => {
  it("rejeita sem papel na organização (403 FORBIDDEN)", async () => {
    mocks.getOrgRole.mockResolvedValue(null);
    await expect(
      onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mocks.repo.complete).not.toHaveBeenCalled();
  });

  it("rejeita papel member (sem profile:edit)", async () => {
    mocks.getOrgRole.mockResolvedValue("member");
    await expect(
      onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

describe("onboardingService.complete — bind de contacto verificado", () => {
  it("rejeita sem qualquer contacto (400 NO_CONTACT)", async () => {
    const input = baseInput({ profile: { name: "Construções XYZ", categoryIds: ["cat-1"] } });
    await expect(onboardingService.complete(user, input as never, [])).rejects.toMatchObject({
      status: 400,
      code: "NO_CONTACT",
    });
  });

  it("rejeita contacto não verificado (403 CONTACT_NOT_VERIFIED)", async () => {
    await expect(onboardingService.complete(user, baseInput() as never, [])).rejects.toMatchObject({
      status: 403,
      code: "CONTACT_NOT_VERIFIED",
    });
    expect(mocks.repo.complete).not.toHaveBeenCalled();
  });

  it("aceita quando o contacto submetido bate com o verificado", async () => {
    const result = await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    expect(result).toEqual({ profileId: "p1", created: true });
    expect(mocks.repo.complete).toHaveBeenCalledTimes(1);
  });

  it("normaliza o contacto (MZ) antes de comparar com o verificado", async () => {
    const verified = [{ channel: "whatsapp" as const, identifier: "258821234567" }];
    const result = await onboardingService.complete(
      user,
      baseInput({ profile: { name: "Construções XYZ", categoryIds: ["cat-1"], whatsapp: "82 123-4567" } }) as never,
      verified,
    );
    expect(result.created).toBe(true);
  });
});

describe("onboardingService.complete — slug", () => {
  it("gera slug único no primeiro publish (sem input.slug)", async () => {
    const result = await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    expect(result).toEqual({ profileId: "p1", created: true });
    const call = mocks.repo.complete.mock.calls[0]?.[0] as { profileData: { slug: string } };
    expect(call.profileData.slug).toBe("construcoes-xyz");
  });

  it("resolve colisão de slug com sufixo numérico", async () => {
    mocks.repo.slugExists.mockResolvedValueOnce(true); // "construcoes-xyz" ocupado
    await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    const call = mocks.repo.complete.mock.calls[0]?.[0] as { profileData: { slug: string } };
    expect(call.profileData.slug).toBe("construcoes-xyz-2");
  });

  it("preserva o slug do perfil existente no retry (nunca escreve vazio)", async () => {
    mocks.repo.findOrganizationProfile.mockResolvedValue({ id: "p1", slug: "construcoes-xyz" });
    await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    const call = mocks.repo.complete.mock.calls[0]?.[0] as { profileData: { slug: string } };
    expect(call.profileData.slug).toBe("construcoes-xyz");
    expect(call.profileData.slug).not.toBe("");
    expect(mocks.repo.slugExists).not.toHaveBeenCalled();
  });
});

describe("onboardingService.complete — qualificação e welcome", () => {
  it("calcula companySize no servidor quando qualification existe", async () => {
    const input = baseInput({ qualification: { workers: 5, turnoverMzn: null } });
    await onboardingService.complete(user, input as never, [WA_VERIFIED]);
    const call = mocks.repo.complete.mock.calls[0]?.[0] as {
      qualification: { companySize: string; workers: number } | null;
    };
    expect(call.qualification).not.toBeNull();
    expect(call.qualification!.workers).toBe(5);
    expect(typeof call.qualification!.companySize).toBe("string");
  });

  it("envia email de boas-vindas apenas no primeiro publish", async () => {
    await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    await vi.waitFor(() => expect(mocks.sendWelcomeCompanyEmail).toHaveBeenCalledTimes(1));
  });

  it("não envia welcome no retry (created=false)", async () => {
    mocks.repo.findOrganizationProfile.mockResolvedValue({ id: "p1", slug: "construcoes-xyz" });
    mocks.repo.complete.mockResolvedValue({ profileId: "p1", created: false });
    await onboardingService.complete(user, baseInput() as never, [WA_VERIFIED]);
    expect(mocks.sendWelcomeCompanyEmail).not.toHaveBeenCalled();
  });
});

describe("AppError", () => {
  it("é instância de AppError com status e code", async () => {
    mocks.getOrgRole.mockResolvedValue(null);
    const err = await onboardingService
      .complete(user, baseInput() as never, [WA_VERIFIED])
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
  });
});