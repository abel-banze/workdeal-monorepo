import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@workdeal/shared";

const mocks = vi.hoisted(() => ({
  repo: {
    createCampaign: vi.fn(),
    findCampaignById: vi.fn(),
    setStatus: vi.fn(),
    setTotals: vi.fn(),
    addCounts: vi.fn(),
    listAllCompanyContacts: vi.fn(),
    insertRecipients: vi.fn(),
    takePending: vi.fn(),
    countPending: vi.fn(),
    markSent: vi.fn(),
    markFailed: vi.fn(),
    markSkipped: vi.fn(),
    findOrganization: vi.fn(),
    listCampaigns: vi.fn(),
  },
  sendEmail: vi.fn(),
  sendSms: vi.fn(),
  sendWhatsappTemplate: vi.fn(),
}));

vi.mock("../repositories/broadcast.repository.js", () => ({ broadcastRepository: mocks.repo }));
vi.mock("../lib/channels.js", () => ({
  sendEmail: mocks.sendEmail,
  sendSms: mocks.sendSms,
  sendWhatsappTemplate: mocks.sendWhatsappTemplate,
}));

import { broadcastService } from "./broadcast.service.js";

const staff = { id: "staff-1", name: "Staff" } as unknown as AuthUser;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendWhatsappTemplate.mockResolvedValue({ outcome: "sent" });
  mocks.sendEmail.mockResolvedValue({ outcome: "sent" });
  mocks.sendSms.mockResolvedValue({ outcome: "sent" });
});

describe("broadcast", () => {
  it("rejeita template WhatsApp desconhecido", async () => {
    await expect(broadcastService.createCampaign(staff, { title: "X", channel: "whatsapp", templateKey: "nope" })).rejects.toMatchObject({
      code: "UNKNOWN_TEMPLATE",
    });
    expect(mocks.repo.createCampaign).not.toHaveBeenCalled();
  });

  it("prepare só em rascunho e materializa audiência deduplicada", async () => {
    mocks.repo.findCampaignById.mockResolvedValue({ id: "c-1", status: "sending", channel: "whatsapp" });
    await expect(broadcastService.prepare("c-1")).rejects.toMatchObject({ code: "INVALID_STATUS" });

    mocks.repo.findCampaignById.mockResolvedValue({ id: "c-1", status: "draft", channel: "email", totalRecipients: 0 });
    mocks.repo.listAllCompanyContacts.mockResolvedValue([
      { organizationId: "o-1", name: "A", contactPhone: null, contactEmail: "a@x.co.mz", profileWhatsapp: null, profilePhone: null, profileEmail: null },
      { organizationId: "o-2", name: "B", contactPhone: null, contactEmail: "A@X.CO.MZ", profileWhatsapp: null, profilePhone: null, profileEmail: null },
      { organizationId: "o-3", name: "C", contactPhone: null, contactEmail: "lixo", profileWhatsapp: null, profilePhone: null, profileEmail: null },
    ]);
    mocks.repo.insertRecipients.mockResolvedValue(1);
    mocks.repo.getCampaign = undefined as never;
    const getSpy = vi.spyOn(broadcastService, "getCampaign").mockResolvedValue({ id: "c-1", status: "ready", totalRecipients: 1 } as never);
    const res = await broadcastService.prepare("c-1");
    expect(mocks.repo.insertRecipients).toHaveBeenCalledWith("c-1", [{ organizationId: "o-1", address: "a@x.co.mz", companyName: "A" }]);
    expect(res.totalRecipients).toBe(1);
    getSpy.mockRestore();
  });

  it("sendBatch envia pendentes, acumula e fecha quando esvazia", async () => {
    mocks.repo.findCampaignById.mockResolvedValue({ id: "c-1", status: "ready", channel: "whatsapp", templateKey: "tasks_cta", subject: null, bodyHtml: null, totalRecipients: 2 });
    mocks.repo.takePending.mockResolvedValue([
      { id: "r-1", address: "258841234567", companyName: "A" },
      { id: "r-2", address: "258841234568", companyName: "B" },
    ]);
    mocks.repo.countPending.mockResolvedValue(0);
    const res = await broadcastService.sendBatch("c-1", 25);
    expect(res).toMatchObject({ sent: 2, failed: 0, remaining: 0 });
    expect(mocks.repo.markSent).toHaveBeenCalledTimes(2);
    expect(mocks.repo.setStatus).toHaveBeenCalledWith("c-1", "sent");
    expect(mocks.sendWhatsappTemplate).toHaveBeenCalledWith(expect.objectContaining({ templateName: "tasks_cta", templateParams: ["A"] }));
  });

  it("sendIndividual exige contacto válido", async () => {
    mocks.repo.findOrganization.mockResolvedValue({ id: "o-1", name: "A", contactPhone: null, contactEmail: null, profileWhatsapp: null, profilePhone: null, profileEmail: null });
    await expect(broadcastService.sendIndividual(staff, { organizationId: "o-1", channel: "whatsapp", templateKey: "tasks_cta" })).rejects.toMatchObject({
      code: "NO_CONTACT",
    });
  });
});
