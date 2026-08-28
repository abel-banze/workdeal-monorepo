import type { AuthUser } from "@workdeal/shared";
import { ok } from "../lib/api-response.js";
import { tasksService } from "../services/tasks.service.js";

type JsonTaskPatch = Parameters<typeof tasksService.updateTask>[2];

export const tasksController = {
  async create(user: AuthUser, body: Parameters<typeof tasksService.createTask>[1]) {
    const row = await tasksService.createTask(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async list(query: Parameters<typeof tasksService.listTasks>[0]) {
    const res = await tasksService.listTasks(query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async my(user: AuthUser, query: Parameters<typeof tasksService.listMyTasks>[1]) {
    const res = await tasksService.listMyTasks(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async get(id: string) {
    const row = await tasksService.getTask(id);
    return { body: ok(row), status: 200 as const };
  },
  async patch(user: AuthUser, id: string, body: JsonTaskPatch) {
    const row = await tasksService.updateTask(user, id, body);
    return { body: ok(row), status: 200 as const };
  },
  async listProposals(user: AuthUser, taskId: string, query: Parameters<typeof tasksService.listProposals>[2]) {
    const res = await tasksService.listProposals(user, taskId, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async myProposals(user: AuthUser, query: Parameters<typeof tasksService.myProposals>[1]) {
    const res = await tasksService.myProposals(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async submitProposal(user: AuthUser, body: Parameters<typeof tasksService.submitProposal>[1]) {
    const row = await tasksService.submitProposal(user, body);
    return { body: ok(row), status: 201 as const };
  },
  async updateProposalStatus(user: AuthUser, taskId: string, proposalId: string, body: { status: "shortlisted" | "rejected" }) {
    const row = await tasksService.updateProposalStatus(user, taskId, proposalId, body.status);
    return { body: ok(row), status: 200 as const };
  },
  async acceptProposal(user: AuthUser, taskId: string, proposalId: string, body: Parameters<typeof tasksService.acceptProposal>[3]) {
    const row = await tasksService.acceptProposal(user, taskId, proposalId, body);
    return { body: ok(row), status: 201 as const };
  },
  async listBids(user: AuthUser, query: Parameters<typeof tasksService.listBids>[1]) {
    const res = await tasksService.listBids(user, query);
    return { body: ok(res.items, { total: res.total, page: res.page, limit: res.limit }), status: 200 as const };
  },
  async getBid(user: AuthUser, id: string) {
    const row = await tasksService.getBid(user, id);
    return { body: ok(row), status: 200 as const };
  },
  async patchBid(user: AuthUser, id: string, body: { status: string; reviewNote?: string | null }) {
    const { reviewNote, ...rest } = body;
    const row = await tasksService.updateBid(user, id, rest.status as Parameters<typeof tasksService.updateBid>[2], reviewNote);
    return { body: ok(row), status: 200 as const };
  },
};