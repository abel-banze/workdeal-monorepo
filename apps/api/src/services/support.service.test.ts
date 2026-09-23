import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@workdeal/shared";

const mocks = vi.hoisted(() => ({
  getOrgRole: vi.fn(),
  supportRepo: {
    createTicket: vi.fn(),
    addMessage: vi.fn(),
    findTicketById: vi.fn(),
    listMessages: vi.fn(),
    listTicketsForUser: vi.fn(),
    listTicketsAdmin: vi.fn(),
    countMessages: vi.fn(),
    updateStatus: vi.fn(),
  },
  notificationsRepo: {
    findUserContact: vi.fn(),
  },
  dispatch: vi.fn(),
}));

vi.mock("@workdeal/auth", () => ({ getOrgRole: mocks.getOrgRole }));
vi.mock("../repositories/support.repository.js", () => ({ supportRepository: mocks.supportRepo }));
vi.mock("../repositories/notifications.repository.js", () => ({
  notificationsRepository: mocks.notificationsRepo,
}));
vi.mock("./notifications.service.js", () => ({ notificationsService: { dispatch: mocks.dispatch } }));

import { supportService } from "./support.service.js";

const user = { id: "u-1", name: "User" } as unknown as AuthUser;
const staff = { id: "staff-1", name: "Staff", systemRole: "admin" } as unknown as AuthUser;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.dispatch.mockResolvedValue({ ok: true, channels: {}, ids: [] });
});

describe("support tickets", () => {
  it("createTicket guarda a 1ª mensagem e devolve thread", async () => {
    mocks.supportRepo.createTicket.mockResolvedValue({ id: "t-1", userId: "u-1", status: "open" });
    mocks.supportRepo.addMessage.mockResolvedValue({ id: "m-1" });
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-1", status: "open" });
    mocks.supportRepo.listMessages.mockResolvedValue([{ id: "m-1" }]);
    const res = await supportService.createTicket(user, { subject: "Ajuda aqui", category: "tecnico", message: "Detalhes do problema" });
    expect(mocks.supportRepo.addMessage).toHaveBeenCalledWith(expect.objectContaining({ ticketId: "t-1", senderUserId: "u-1" }));
    expect(res.messages).toHaveLength(1);
  });

  it("reply do dono reabre waiting_user", async () => {
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-1", status: "waiting_user" });
    mocks.supportRepo.addMessage.mockResolvedValue({ id: "m-2" });
    await supportService.reply(user, "t-1", { message: "mais info" });
    expect(mocks.supportRepo.updateStatus).toHaveBeenCalledWith("t-1", "open");
  });

  it("reply em pedido fechado dá 409", async () => {
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-1", status: "closed" });
    await expect(supportService.reply(user, "t-1", { message: "x" })).rejects.toMatchObject({ code: "TICKET_CLOSED" });
    expect(mocks.supportRepo.addMessage).not.toHaveBeenCalled();
  });

  it("getTicket bloqueia quem não é dono", async () => {
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-other", status: "open" });
    await expect(supportService.getTicket(user, "t-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("replyAdmin notifica o dono (dispatcher)", async () => {
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-1", organizationId: "org-1", subject: "Ajuda", status: "open" });
    mocks.supportRepo.addMessage.mockResolvedValue({ id: "m-3" });
    mocks.notificationsRepo.findUserContact.mockResolvedValue({ email: "u@test.mz", name: "User" });
    await supportService.replyAdmin(staff, "t-1", { message: "A ver" });
    expect(mocks.supportRepo.updateStatus).toHaveBeenCalledWith("t-1", "waiting_user");
    await vi.waitFor(() => expect(mocks.dispatch).toHaveBeenCalled());
    expect(mocks.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "support_reply", userIds: ["u-1"] }));
  });

  it("replyAdmin interno não notifica", async () => {
    mocks.supportRepo.findTicketById.mockResolvedValue({ id: "t-1", userId: "u-1", organizationId: null, subject: "Ajuda", status: "open" });
    mocks.supportRepo.addMessage.mockResolvedValue({ id: "m-4" });
    await supportService.replyAdmin(staff, "t-1", { message: "nota" }, true);
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
});
