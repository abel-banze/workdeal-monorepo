import { z } from "zod";

// ── Eventos ────────────────────────────────────────────────────────

export const eventStatusSchema = z.enum(["draft", "published", "cancelled", "ended"]);
export const eventRegistrationStatusSchema = z.enum(["registered", "cancelled", "checked_in"]);

export const EVENT_STATUS_LABELS_PT: Record<z.infer<typeof eventStatusSchema>, string> = {
  draft: "Rascunho",
  published: "Publicado",
  cancelled: "Cancelado",
  ended: "Concluído",
};

export const EVENT_REGISTRATION_STATUS_LABELS_PT: Record<z.infer<typeof eventRegistrationStatusSchema>, string> = {
  registered: "Inscrito",
  cancelled: "Cancelado",
  checked_in: "Confirmado/Apresente",
};

const eventFormFields = z.object({
  organizerProfileId: z.string().min(1, "Perfil organizador obrigatório"),
  categoryId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(3, "Título deve ter pelo menos 3 caracteres").max(160),
  description: z.string().trim().min(10, "Descrição deve ter pelo menos 10 caracteres").max(8000),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  isOnline: z.boolean().default(false),
  onlineUrl: z.string().trim().url("URL inválido").max(500).nullable().optional(),
  venueName: z.string().trim().max(160).nullable().optional(),
  province: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  coverImage: z.string().trim().url("URL da imagem inválido").max(500).nullable().optional(),
  capacity: z.number().int().min(1).nullable().optional(),
});

export const createEventSchema = eventFormFields.refine(
  (d) => d.endAt > d.startAt,
  {
    message: "Fim do evento deve ser depois do início",
    path: ["endAt"],
  },
);

export const updateEventSchema = eventFormFields.partial().extend({
  status: eventStatusSchema.optional(),
});

export const eventListQuerySchema = z.object({
  status: eventStatusSchema.optional().default("published"),
  upcoming: z.coerce.boolean().optional(),
  categoryId: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  organizerSlug: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export const createEventRegistrationSchema = z.object({
  eventId: z.string().min(1, "Evento obrigatório"),
});

export const updateEventRegistrationSchema = z.object({
  status: z.enum(["cancelled", "checked_in"]),
});

export const eventRegistrationListQuerySchema = z.object({
  status: eventRegistrationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// ── Views (respostas da API) ───────────────────────────────────────

export const eventViewSchema = z.object({
  id: z.string(),
  organizerProfileId: z.string(),
  categoryId: z.string().nullable(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  startAt: z.date(),
  endAt: z.date(),
  isOnline: z.boolean(),
  onlineUrl: z.string().nullable(),
  venueName: z.string().nullable(),
  province: z.string().nullable(),
  district: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  coverImage: z.string().nullable(),
  capacity: z.number().nullable(),
  status: eventStatusSchema,
  registrationCount: z.number().optional().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o frontend público (quem organiza)
  organizerName: z.string().nullable().optional(),
  organizerSlug: z.string().nullable().optional(),
  organizerLogo: z.string().nullable().optional(),
  // Estado da inscrição do utilizador autenticado (optionalAuth)
  myRegistration: eventRegistrationStatusSchema.nullable().optional(),
});

export const eventRegistrationViewSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.string(),
  status: eventRegistrationStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  // Enriquecimento para o dashboard (apresentação)
  userName: z.string().nullable().optional(),
  userEmail: z.string().nullable().optional(),
  userImage: z.string().nullable().optional(),
  eventTitle: z.string().nullable().optional(),
  eventSlug: z.string().nullable().optional(),
  eventStatus: eventStatusSchema.nullable().optional(),
  startAt: z.date().nullable().optional(),
});

export type EventStatus = z.infer<typeof eventStatusSchema>;
export type EventRegistrationStatus = z.infer<typeof eventRegistrationStatusSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type CreateEventRegistrationInput = z.infer<typeof createEventRegistrationSchema>;
export type EventRegistrationListQuery = z.infer<typeof eventRegistrationListQuerySchema>;
export type EventView = z.infer<typeof eventViewSchema>;
export type EventRegistrationView = z.infer<typeof eventRegistrationViewSchema>;