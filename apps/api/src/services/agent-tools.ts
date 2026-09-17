import { z } from "zod";
import { getOrgRole } from "@workdeal/auth";
import { hasOrgPermission, type AuthUser } from "@workdeal/shared";
import type { AgentTool } from "@workdeal/agents";
import { tasksRepository } from "../repositories/tasks.repository.js";
import { negotiationsRepository } from "../repositories/negotiations.repository.js";
import { profilesService } from "./profiles.service.js";
import { tasksService } from "./tasks.service.js";
import { AppError } from "../lib/errors.js";

export interface AgentToolsScope {
  user: AuthUser;
  organizationId: string | null;
}

const clampLimit = (v: unknown, def = 5, max = 10): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : def;
  return Math.min(Math.max(n, 1), max);
};

/** Dono da tarefa OU membro da org solicitante com tasks:manage (espelho de tasks.service). */
async function assertCanManageTask(user: AuthUser, taskRow: { requesterUserId: string; requesterOrganizationId: string | null }) {
  if (taskRow.requesterUserId === user.id) return;
  if (taskRow.requesterOrganizationId) {
    const role = await getOrgRole(user.id, taskRow.requesterOrganizationId);
    if (role && hasOrgPermission(role, "tasks:manage")) return;
  }
  throw new AppError(403, "FORBIDDEN", "Sem permissão para gerir esta tarefa");
}

/**
 * Ferramentas do assistente com acesso à BD — respostas com base em dados.
 * Tudo o que é público devolve o mesmo subconjunto público do directório;
 * o que é privado exige relação com o recurso (RBAC executado aqui dentro).
 */
export function buildAssistantTools(scope: AgentToolsScope): AgentTool[] {
  const { user } = scope;

  const searchProfiles: AgentTool = {
    name: "search_profiles",
    description:
      "Pesquisa empresas no directório público (o MESMO motor da pesquisa do site /companies: texto integral + localização) por nome/actividade, opcionalmente por província. Devolve nome, slug, slogan, província e selos — confia nestes resultados, não inventes outros.",
    inputSchema: z.object({
      q: z.string().trim().min(2).max(120).describe("Texto de pesquisa"),
      province: z.string().trim().max(80).optional().describe("Província exacta"),
      limit: z.number().int().min(1).max(10).optional().describe("Máximo de resultados (omissão 5)"),
    }),
    execute: async (input) => {
      const args = input as { q: string; province?: string; limit?: number };
      // Mesmo motor do directório (/companies → profilesService.listProfiles →
      // searchService): o repository directo ignora o `q` e não anexa
      // província/selos, por isso nunca é usado aqui.
      const res = await profilesService.listProfiles({
        q: args.q,
        province: args.province,
        status: "active",
        page: 1,
        limit: clampLimit(args.limit),
      });
      return {
        total: res.total,
        items: res.items.map((p) => ({
          name: p.name,
          slug: p.slug,
          tagline: p.tagline ?? null,
          province: p.province ?? null,
          badges: (p.badges ?? []).map((b) => b.name).filter(Boolean),
        })),
      };
    },
  };

  const getProfile: AgentTool = {
    name: "get_profile",
    description: "Ficha pública de uma empresa pelo slug: descrição, localização, contactos verificados (canais), serviços, selos e avaliações.",
    inputSchema: z.object({
      slug: z.string().trim().min(1).max(120).describe("Slug do perfil"),
    }),
    execute: async (input) => {
      const args = input as { slug: string };
      const view = await profilesService.getPublicProfile(args.slug);
      return {
        name: view.name,
        tagline: view.tagline,
        description: view.description,
        location: view.location
          ? [view.location.district, view.location.province].filter(Boolean).join(" · ")
          : null,
        categories: view.categories.map((c) => c.name),
        badges: view.badges.map((b) => b.name),
        reviews: view.reviews,
        services: view.services.slice(0, 10).map((s) => ({ title: s.title, priceMzn: s.priceMzn })),
        verifiedChannels: view.contactVerifications.map((c) => c.channel),
      };
    },
  };

  const searchTasks: AgentTool = {
    name: "search_tasks",
    description: "Pesquisa tarefas abertas (oportunidades) por texto e/ou província. Devolve título, descrição curta, orçamento, localização e prazo.",
    inputSchema: z.object({
      q: z.string().trim().max(120).optional().describe("Texto no título"),
      province: z.string().trim().max(80).optional().describe("Província exacta"),
      limit: z.number().int().min(1).max(10).optional().describe("Máximo de resultados (omissão 5)"),
    }),
    execute: async (input) => {
      const args = input as { q?: string; province?: string; limit?: number };
      const res = await tasksRepository.list({
        statuses: ["open", "in_review"],
        title: args.q || undefined,
        province: args.province,
        page: 1,
        limit: clampLimit(args.limit),
      });
      return {
        total: res.total,
        items: (res.items as { id: string; title: string; description: string; priceMinMzn: number | null; priceMaxMzn: number | null; province: string | null; district: string | null; proposalDeadlineAt: unknown }[]).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description?.slice(0, 300) ?? null,
          priceMinMzn: t.priceMinMzn,
          priceMaxMzn: t.priceMaxMzn,
          location: [t.district, t.province].filter(Boolean).join(" · ") || null,
          proposalDeadlineAt: t.proposalDeadlineAt,
        })),
      };
    },
  };

  const getTask: AgentTool = {
    name: "get_task",
    description: "Detalhe público de uma tarefa pelo id (sem identidade de quem publicou).",
    inputSchema: z.object({
      taskId: z.string().trim().min(1).describe("ID da tarefa"),
    }),
    execute: async (input) => {
      const args = input as { taskId: string };
      const t = await tasksService.getTask(args.taskId);
      if (!t) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
      return {
        id: t.id,
        title: t.title,
        description: t.description?.slice(0, 600) ?? null,
        status: t.status,
        priceMinMzn: t.priceMinMzn,
        priceMaxMzn: t.priceMaxMzn,
        province: t.province,
        district: t.district,
        proposalDeadlineAt: t.proposalDeadlineAt,
      };
    },
  };

  const taskProposalsSummary: AgentTool = {
    name: "task_proposals_summary",
    description: "Resumo das propostas de UMA tarefa do utilizador (só quem a gere): contagens por estado, nº de proponentes, preços mín/médio/máx e prazos. Para comparar e decidir.",
    inputSchema: z.object({
      taskId: z.string().trim().min(1).describe("ID da tarefa"),
    }),
    execute: async (input) => {
      const args = input as { taskId: string };
      const taskRow = await tasksRepository.findById(args.taskId);
      if (!taskRow) throw new AppError(404, "TASK_NOT_FOUND", "Tarefa não encontrada");
      await assertCanManageTask(user, taskRow);
      const { items, total } = await tasksRepository.listProposals(args.taskId, undefined, 1, 100);
      const byStatus: Record<string, number> = {};
      const prices: number[] = [];
      const days: number[] = [];
      for (const p of items as { status: string; priceMzn: number | null; estimatedDays: number | null }[]) {
        byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
        if (p.priceMzn != null) prices.push(p.priceMzn);
        if (p.estimatedDays != null) days.push(p.estimatedDays);
      }
      const avg = (xs: number[]) => (xs.length === 0 ? null : Math.round(xs.reduce((a, b) => a + b, 0) / xs.length));
      return {
        taskId: args.taskId,
        taskTitle: taskRow.title,
        total,
        byStatus,
        priceMinMzn: prices.length ? Math.min(...prices) : null,
        priceAvgMzn: avg(prices),
        priceMaxMzn: prices.length ? Math.max(...prices) : null,
        daysMin: days.length ? Math.min(...days) : null,
        daysAvg: avg(days),
        daysMax: days.length ? Math.max(...days) : null,
      };
    },
  };

  const myActivity: AgentTool = {
    name: "my_activity",
    description: "Resumo da actividade do utilizador: tarefas publicadas (abertas, com id e título para usar noutras ferramentas), propostas enviadas e negociações abertas por lado.",
    inputSchema: z.object({}),
    execute: async () => {
      const [openTasks, sent, profileIds, managerOrgIds] = await Promise.all([
        tasksRepository.listByRequester(user.id, "open", 1, 10),
        tasksRepository.listProposalsByProviders(await tasksRepository.getUserProfileIds(user.id), undefined, 1, 1),
        tasksRepository.getUserProfileIds(user.id),
        negotiationsRepository.listManagerOrgIds(user.id),
      ]);
      const [asRequester, asProvider] = await Promise.all([
        negotiationsRepository.listThreadsForRequester(user.id, managerOrgIds, "open", 1, 1),
        negotiationsRepository.listThreadsForProvider(profileIds, "open", 1, 1),
      ]);
      return {
        openTasks: openTasks.total,
        openTaskList: (openTasks.items as { id: string; title: string }[]).map((t) => ({ id: t.id, title: t.title })),
        proposalsSent: sent.total,
        negotiationsOpenAsRequester: asRequester.total,
        negotiationsOpenAsProvider: asProvider.total,
      };
    },
  };

  return [searchProfiles, getProfile, searchTasks, getTask, taskProposalsSummary, myActivity];
}
