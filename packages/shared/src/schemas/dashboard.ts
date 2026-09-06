import { z } from "zod";

// Estatísticas agregadas do painel admin (GET /api/v1/admin/dashboard).
// Fonte única de verdade partilhada entre a API Hono e o apps/admin.

export const dashboardStatsSchema = z.object({
  generatedAt: z.string(),
  counts: z.object({
    users: z.number().int().nonnegative(),
    usersWeek: z.number().int().nonnegative(),
    profilesActive: z.number().int().nonnegative(),
    profilesCompany: z.number().int().nonnegative(),
    profilesIndividual: z.number().int().nonnegative(),
    profilesDraft: z.number().int().nonnegative(),
    tasksOpen: z.number().int().nonnegative(),
    tasksWeek: z.number().int().nonnegative(),
  }),
  queues: z.object({
    verificationsPending: z.number().int().nonnegative(),
    reportsPending: z.number().int().nonnegative(),
    tasksInReview: z.number().int().nonnegative(),
    preRegistrations: z.number().int().nonnegative(),
    eventsDraft: z.number().int().nonnegative(),
  }),
  northStar: z.object({
    conexoesSemana: z.number().int().nonnegative(),
    // Crescimento % face à semana anterior — null quando não comparável
    crescimento: z.number().nullable(),
  }),
  // Série de 30 dias (mais recente por último), zero-fill em dias sem registos
  series: z.array(
    z.object({
      label: z.string(), // DD/MM
      // Movimento da plataforma por dia
      usuarios: z.number().int().nonnegative(),
      preRegistros: z.number().int().nonnegative(),
      conversoes: z.number().int().nonnegative(),
      perfis: z.number().int().nonnegative(),
      tarefas: z.number().int().nonnegative(),
      contactos: z.number().int().nonnegative(),
    }),
  ),
  // Feed de sinalização recente (novos perfis, tarefas, pedidos de contacto)
  recent: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(["perfil", "tarefa", "contacto"]),
      title: z.string().nullable(),
      href: z.string().nullable(),
      at: z.string(), // ISO
    }),
  ),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;