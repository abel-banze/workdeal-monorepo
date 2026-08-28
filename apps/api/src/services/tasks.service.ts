import type {
  AuthUser,
  BidListQuery,
  BidStatus,
  CreateBidInput,
  CreateProposalInput,
  CreateTaskInput,
  ProposalStatus,
  TaskListQuery,
  TaskStatus,
  UpdateTaskInput,
} from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { tasksRepository } from "../repositories/tasks.repository.js";

type ProposalListQuery = { status?: ProposalStatus; page?: number; limit?: number };

type TaskRow = Awaited<ReturnType<typeof tasksRepository.findById>>;

const TASK_TRANSITIONS: Record<string, TaskStatus[]> = {
  open: ["in_review", "in_progress", "withdrawn", "cancelled"],
  in_review: ["open", "in_progress", "withdrawn", "cancelled"],
  in_progress: ["completed", "cancelled"],
  withdrawn: ["open", "cancelled"],
  completed: [],
  cancelled: [],
};

const BID_TRANSITIONS: Record<string, BidStatus[]> = {
  awarded: ["in_progress", "cancelled", "disputed"],
  in_progress: ["completed", "cancelled", "disputed"],
  disputed: ["in_progress", "cancelled"],
  completed: [],
  cancelled: [],
};

function assertTransition(from: string, to: string, matrix: Record<string, TaskStatus[] | BidStatus[]>, label: string) {
  if (!matrix[from]?.includes(to as TaskStatus & BidStatus)) {
    throw new AppError(409, "INVALID_TRANSITION", `Transição inválida de ${label} ${from} para ${to}`);
  }
}

export const tasksService = {
  // ── Tarefas ──────────────────────────────────────────────────────
  async createTask(user: AuthUser, input: CreateTaskInput) {
    let requesterOrganizationId: string | null = null;
    if (input.requesterOrganizationId) {
      const isMember = await tasksRepository.isMemberOf(user.id, input.requesterOrganizationId);
      if (!isMember) throw new AppError(403, "FORBIDDEN", "Não pertence à organização solicitante");
      requesterOrganizationId = input.requesterOrganizationId;
    }
    return tasksRepository.create({
      requesterUserId: user.id,
      requesterOrganizationId,
      categoryId: input.categoryId ?? null,
      title: input.title,
      description: input.description,
      priceMinMzn: input.priceMinMzn ?? null,
      priceMaxMzn: input.priceMaxMzn ?? null,
      province: input.province ?? null,
      district: input.district ?? null,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      dueAt: input.dueAt ?? null,
      attachments: (input.attachments ?? []) as never,
    });
  },

  async listTasks(query: TaskListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await tasksRepository.list({
      status: query.status ?? "open",
      categoryId: query.categoryId,
      province: query.province,
      page,
      limit,
    });
    return { items, total, page, limit };
  },

  async listMyTasks(user: AuthUser, query: TaskListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await tasksRepository.listByRequester(user.id, query.status, page, limit);
    const counts = await tasksRepository.countProposalsForTasks(items.map((i) => i.id));
    return { items: items.map((i) => ({ ...i, proposalCount: counts.get(i.id) ?? 0 })), total, page, limit };
  },

  async getTask(id: string): Promise<TaskRow> {
    const row = await tasksRepository.findById(id);
    if (!row) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    return row;
  },

  async updateTask(user: AuthUser, id: string, input: UpdateTaskInput) {
    const existing = await tasksRepository.findById(id);
    if (!existing) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    if (existing.requesterUserId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para editar esta tarefa");

    const patch: Partial<{ id: string; requesterUserId: string; requesterOrganizationId: string | null; categoryId: string | null; title: string; description: string; priceMinMzn: number | null; priceMaxMzn: number | null; province: string | null; district: string | null; address: string | null; latitude: number | null; longitude: number | null; dueAt: Date | null; attachments: never; status: TaskStatus; createdAt: Date; updatedAt: Date }> = {};

    if (input.categoryId !== undefined) patch.categoryId = input.categoryId ?? null;
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.priceMinMzn !== undefined) patch.priceMinMzn = input.priceMinMzn ?? null;
    if (input.priceMaxMzn !== undefined) patch.priceMaxMzn = input.priceMaxMzn ?? null;
    if (input.province !== undefined) patch.province = input.province ?? null;
    if (input.district !== undefined) patch.district = input.district ?? null;
    if (input.address !== undefined) patch.address = input.address ?? null;
    if (input.latitude !== undefined) patch.latitude = input.latitude ?? null;
    if (input.longitude !== undefined) patch.longitude = input.longitude ?? null;
    if (input.dueAt !== undefined) patch.dueAt = input.dueAt ?? null;
    if (input.attachments !== undefined) patch.attachments = input.attachments as never;

    if (input.status !== undefined && input.status !== existing.status) {
      assertTransition(existing.status, input.status, TASK_TRANSITIONS, "tarefa");
      patch.status = input.status;
    }
    return tasksRepository.update(id, patch);
  },

  // ── Propostas ────────────────────────────────────────────────────
  async submitProposal(user: AuthUser, input: CreateProposalInput) {
    const taskRow = await tasksRepository.findById(input.taskId);
    if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    if (taskRow.requesterUserId === user.id) throw new AppError(403, "OWN_TASK", "Não podes propor na tua própria tarefa");
    if (taskRow.status !== "open" && taskRow.status !== "in_review") {
      throw new AppError(409, "TASK_CLOSED", "Tarefa não está a aceitar propostas");
    }
    const profileIds = await tasksRepository.getUserProfileIds(user.id);
    if (!profileIds.includes(input.providerProfileId)) {
      throw new AppError(403, "PROFILE_REQUIRED", "Perfil do fornecedor não pertence ao utilizador");
    }
    const existing = await tasksRepository.findProposalByTaskAndProvider(input.taskId, input.providerProfileId);
    if (existing) throw new AppError(409, "ALREADY_PROPOSED", "Já submeteste uma proposta para esta tarefa");

    const created = await tasksRepository.createProposal({
      taskId: input.taskId,
      providerProfileId: input.providerProfileId,
      message: input.message,
      priceMzn: input.priceMzn ?? null,
      estimatedDays: input.estimatedDays ?? null,
    });
    if (taskRow.status === "open") await tasksRepository.update(input.taskId, { status: "in_review" });
    return created;
  },

  async listProposals(user: AuthUser, taskId: string, query: ProposalListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const taskRow = await tasksRepository.findById(taskId);
    if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    if (taskRow.requesterUserId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para ver as propostas");
    const { items, total } = await tasksRepository.listProposals(taskId, query.status, page, limit);
    return { items, total, page, limit };
  },

  async myProposals(user: AuthUser, query: ProposalListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const profileIds = await tasksRepository.getUserProfileIds(user.id);
    const { items, total } = await tasksRepository.listProposalsByProviders(profileIds, query.status, page, limit);
    return { items, total, page, limit };
  },

  async updateProposalStatus(user: AuthUser, taskId: string, proposalId: string, status: "shortlisted" | "rejected") {
    const taskRow = await tasksRepository.findById(taskId);
    if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    if (taskRow.requesterUserId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir propostas");
    const proposal = await tasksRepository.findProposalById(proposalId);
    if (!proposal || proposal.taskId !== taskId) throw new AppError(404, "PROPOSAL_NOT_FOUND", "Proposta não encontrada");
    if (proposal.status !== "submitted" && proposal.status !== "shortlisted") {
      throw new AppError(409, "INVALID_TRANSITION", "Proposta já decidida não pode ser alterada");
    }
    const updated = await tasksRepository.updateProposalStatus(proposalId, status);
    // Se deixou de haver propostas em análise, a tarefa volta a "open"
    if (status === "rejected" && taskRow.status === "in_review") {
      const remaining = await tasksRepository.listProposals(taskId, "submitted", 1, 1);
      if (remaining.total === 0) await tasksRepository.update(taskId, { status: "open" });
    }
    return updated;
  },

  async acceptProposal(user: AuthUser, taskId: string, proposalId: string, input: CreateBidInput) {
    const taskRow = await tasksRepository.findById(taskId);
    if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
    if (taskRow.requesterUserId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para adjudicar esta tarefa");
    if (taskRow.status !== "open" && taskRow.status !== "in_review" && taskRow.status !== "in_progress") {
      throw new AppError(409, "TASK_CLOSED", "Tarefa já concluída ou cancelada");
    }
    const existingBid = await tasksRepository.findBidByTask(taskId);
    if (existingBid) throw new AppError(409, "ALREADY_AWARDED", "Esta tarefa já tem uma proposta adjudicada");
    const proposal = await tasksRepository.findProposalById(proposalId);
    if (!proposal || proposal.taskId !== taskId) throw new AppError(404, "PROPOSAL_NOT_FOUND", "Proposta não encontrada");
    if (proposal.status === "rejected" || proposal.status === "withdrawn") {
      throw new AppError(409, "INVALID_TRANSITION", "Não podes adjudicar uma proposta retirada ou recusada");
    }

    const agreedPriceMzn = input.agreedPriceMzn ?? proposal.priceMzn;
    if (agreedPriceMzn == null) throw new AppError(400, "PRICE_REQUIRED", "Indica o valor acordado (ou define um preço na proposta)");

    const bid = await tasksRepository.createBid({
      taskId,
      proposalId: proposal.id,
      providerProfileId: proposal.providerProfileId,
      requesterUserId: user.id,
      agreedPriceMzn,
      agreedDeadlineAt: input.agreedDeadlineAt ?? null,
      status: "awarded",
    });
    await tasksRepository.updateProposalStatus(proposalId, "accepted");
    // Rejeita as restantes propostas em análise
    const otherIds = await tasksRepository.listProposalIdsForTaskExcluding(taskId, proposalId);
    for (const pid of otherIds) await tasksRepository.updateProposalStatus(pid, "rejected");
    await tasksRepository.update(taskId, { status: "in_progress" });
    return bid;
  },

  // ── Adjudicações (bids) ──────────────────────────────────────────
  async listBids(user: AuthUser, query: BidListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const role = query.role ?? "provider";
    if (role === "requester") {
      const { items, total } = await tasksRepository.listBidsByRequester(user.id, query.status, page, limit);
      return { items, total, page, limit };
    }
    const profileIds = await tasksRepository.getUserProfileIds(user.id);
    const { items, total } = await tasksRepository.listBidsByProviders(profileIds, query.status, page, limit);
    return { items, total, page, limit };
  },

  async getBid(user: AuthUser, id: string) {
    const bid = await tasksRepository.findBidById(id);
    if (!bid) throw new AppError(404, "BID_NOT_FOUND", "Adjudicação não encontrada");
    const isParty = bid.requesterUserId === user.id || (await tasksRepository.getUserProfileIds(user.id)).includes(bid.providerProfileId);
    if (!isParty) throw new AppError(403, "FORBIDDEN", "Sem permissão para ver esta adjudicação");
    return bid;
  },

  async updateBid(user: AuthUser, id: string, status: BidStatus, reviewNote?: string | null) {
    const bid = await tasksRepository.findBidById(id);
    if (!bid) throw new AppError(404, "BID_NOT_FOUND", "Adjudicação não encontrada");
    const isParty = bid.requesterUserId === user.id || (await tasksRepository.getUserProfileIds(user.id)).includes(bid.providerProfileId);
    if (!isParty) throw new AppError(403, "FORBIDDEN", "Sem permissão para esta adjudicação");
    assertTransition(bid.status, status, BID_TRANSITIONS, "adjudicação");

    const patch: Partial<{ status: BidStatus; reviewNote: string | null; updatedAt: Date; agreedPriceMzn: number; agreedDeadlineAt: Date | null; taskId: string; proposalId: string; providerProfileId: string; requesterUserId: string; id: string; createdAt: Date }> = { status };
    if (reviewNote !== undefined) patch.reviewNote = reviewNote ?? null;
    const updated = await tasksRepository.updateBid(id, patch);

    // Mantém a tarefa em sincronia nos fechos principais
    if (status === "completed") await tasksRepository.update(bid.taskId, { status: "completed" });
    if (status === "cancelled") await tasksRepository.update(bid.taskId, { status: "cancelled" });
    return updated;
  },
};