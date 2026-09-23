import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@workdeal/shared";

const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  notificationsRepo: {
    create: vi.fn(),
    updateMetadata: vi.fn(),
    listMemberOrgIds: vi.fn(),
    listOrgMemberUserIds: vi.fn(),
    findUserContact: vi.fn(),
    findOrgContactPhone: vi.fn(),
    resolveProfileRecipients: vi.fn(),
    list: vi.fn(),
    countUnread: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
  orgsRepo: {
    getNotificationPrefs: vi.fn(),
    updateNotificationPrefs: vi.fn(),
  },
  resendSend: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/notifications.repository.js", () => ({ notificationsRepository: mocks.notificationsRepo }));
vi.mock("../repositories/organizations.repository.js", () => ({ organizationsRepository: mocks.orgsRepo }));
vi.mock("../lib/resend.js", () => ({ resend: { emails: { send: mocks.resendSend } }, EMAIL_FROM: "test@workdeal.co.mz" }));
vi.stubGlobal("fetch", mocks.fetch);

import { notificationsService } from "./notifications.service.js";

const user = { id: "u-1", name: "User", email: "u@test.mz" } as unknown as AuthUser;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notificationsRepo.create.mockImplementation(async (data: Record<string, unknown>) => ({ id: `n-${Math.random()}`, ...data }));
  mocks.notificationsRepo.updateMetadata.mockResolvedValue(undefined);
  mocks.orgsRepo.getNotificationPrefs.mockResolvedValue({ email: true, whatsapp: true, sms: false });
  mocks.resendSend.mockResolvedValue({ data: { id: "mail-1" }, error: null });
  mocks.fetch.mockResolvedValue({ ok: true, text: async () => "" });
});

describe("notifications dispatch", () => {
  it("cria inbox e envia email+whatsapp quando prefs ligadas", async () => {
    process.env.ZERNIO_API_KEY = "test-key";
    process.env.ZERNIO_PHONE_ID = "test-account";
    try {
      const res = await notificationsService.dispatch({
        organizationId: "org-1",
        userIds: ["u-1"],
        type: "proposal_received",
        title: "Nova proposta",
        email: { to: "u@test.mz", subject: "Nova proposta", html: "<p>hi</p>" },
        whatsapp: { toDigits: "+258841234567", templateName: "quote_request", templateParams: ["A", "B"] },
      });
      expect(res.ok).toBe(true);
      expect(res.channels).toMatchObject({ in_app: "sent", email: "sent", whatsapp: "sent" });
      expect(mocks.notificationsRepo.create).toHaveBeenCalledTimes(1);
      expect(mocks.resendSend).toHaveBeenCalledTimes(1);
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse((mocks.fetch.mock.calls[0] as [string, { body: string }])[1].body);
      expect(body.participantId).toBe("258841234567");
    } finally {
      delete process.env.ZERNIO_API_KEY;
      delete process.env.ZERNIO_PHONE_ID;
    }
  });

  it("salta canais desligados nas prefs mas regista o inbox", async () => {
    mocks.orgsRepo.getNotificationPrefs.mockResolvedValue({ email: false, whatsapp: false, sms: false });
    const res = await notificationsService.dispatch({
      organizationId: "org-1",
      userIds: ["u-1"],
      type: "quote_received",
      title: "Nova cotação",
      email: { to: "u@test.mz", subject: "s", html: "<p>hi</p>" },
      whatsapp: { toDigits: "258841234567", templateName: "quote_request", templateParams: [] },
    });
    expect(res.ok).toBe(true);
    expect(res.channels).toMatchObject({ in_app: "sent", email: "skipped", whatsapp: "skipped" });
    expect(mocks.resendSend).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.notificationsRepo.create).toHaveBeenCalledTimes(1);
  });

  it("usa prefs por defeito sem organização e normaliza telefone inválido como skipped", async () => {
    const res = await notificationsService.dispatch({
      userIds: ["u-1"],
      type: "bid_awarded",
      title: "Adjudicada",
      whatsapp: { toDigits: "abc", templateName: "t", templateParams: [] },
    });
    expect(res.channels).toMatchObject({ in_app: "sent", whatsapp: "skipped" });
    expect(mocks.orgsRepo.getNotificationPrefs).not.toHaveBeenCalled();
  });

  it("falha graciosamente sem destinatário", async () => {
    const res = await notificationsService.dispatch({ type: "admin_notice", title: "x" });
    expect(res.ok).toBe(false);
    expect(mocks.notificationsRepo.create).not.toHaveBeenCalled();
  });

  it("cria uma linha por utilizador", async () => {
    await notificationsService.dispatch({ organizationId: "org-1", userIds: ["u-1", "u-2"], type: "event_registered", title: "Nova inscrição" });
    expect(mocks.notificationsRepo.create).toHaveBeenCalledTimes(2);
  });
});

describe("notifications inbox", () => {
  it("markRead bloqueia estranhos", async () => {
    mocks.notificationsRepo.findById.mockResolvedValue({ id: "n-1", recipientUserId: "u-other", recipientOrganizationId: "org-9" });
    mocks.getOrgRole.mockResolvedValue(null);
    await expect(notificationsService.markRead(user, "n-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.notificationsRepo.markRead).not.toHaveBeenCalled();
  });

  it("markRead permite membro da organização", async () => {
    mocks.notificationsRepo.findById.mockResolvedValue({ id: "n-1", recipientUserId: null, recipientOrganizationId: "org-9" });
    mocks.getOrgRole.mockResolvedValue("member");
    mocks.notificationsRepo.markRead.mockResolvedValue({ id: "n-1" });
    await notificationsService.markRead(user, "n-1");
    expect(mocks.notificationsRepo.markRead).toHaveBeenCalledWith("n-1");
  });

  it("markRead de linha inexistente dá 404", async () => {
    mocks.notificationsRepo.findById.mockResolvedValue(null);
    await expect(notificationsService.markRead(user, "missing")).rejects.toMatchObject({ code: "NOTIFICATION_NOT_FOUND" });
  });
});
