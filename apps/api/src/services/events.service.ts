import type {
  AuthUser,
  CreateEventInput,
  EventListQuery,
  EventRegistrationListQuery,
  UpdateEventInput,
} from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { eventsRepository } from "../repositories/events.repository.js";
import { tasksRepository } from "../repositories/tasks.repository.js";
import { slugify } from "./profiles.service.js";

async function ensureOrganizerProfile(user: AuthUser, organizerProfileId: string) {
  const profileIds = await tasksRepository.getUserProfileIds(user.id);
  if (!profileIds.includes(organizerProfileId)) {
    throw new AppError(403, "PROFILE_REQUIRED", "Perfil organizador não pertence ao utilizador");
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const attempt = base || "evento";
  if (!(await eventsRepository.slugExists(attempt))) return attempt;
  let n = 2;
  while (n < 1000) {
    const candidate = `${attempt}-${n}`;
    if (!(await eventsRepository.slugExists(candidate))) return candidate;
    n++;
  }
  return `${attempt}-${Date.now().toString(36)}`;
}

export const eventsService = {
  // ── Eventos ──────────────────────────────────────────────────────
  async createEvent(user: AuthUser, input: CreateEventInput) {
    await ensureOrganizerProfile(user, input.organizerProfileId);
    const slug = await uniqueSlug(slugify(input.title));
    return eventsRepository.create({
      organizerProfileId: input.organizerProfileId,
      categoryId: input.categoryId ?? null,
      title: input.title,
      slug,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      isOnline: input.isOnline ?? false,
      onlineUrl: input.onlineUrl ?? null,
      venueName: input.venueName ?? null,
      province: input.province ?? null,
      district: input.district ?? null,
      address: input.address ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      coverImage: input.coverImage ?? null,
      capacity: input.capacity ?? null,
      status: "draft",
    });
  },

  async listEvents(query: EventListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await eventsRepository.list({
      status: query.status ?? "published",
      categoryId: query.categoryId,
      province: query.province,
      upcoming: query.upcoming,
      organizerSlug: query.organizerSlug,
      page,
      limit,
    });
    return { items, total, page, limit };
  },

  async myEvents(user: AuthUser, query: EventListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const profileIds = await tasksRepository.getUserProfileIds(user.id);
    const { items, total } = await eventsRepository.listByOrganizer(profileIds, query.status, page, limit);
    const counts = await eventsRepository.countRegistrationsForEvents(items.map((i) => i.id));
    return { items: items.map((i) => ({ ...i, registrationCount: counts.get(i.id) ?? 0 })), total, page, limit };
  },

  async getEvent(idOrSlug: string, isSlug: boolean, user?: AuthUser | null) {
    const row = isSlug ? await eventsRepository.findBySlug(idOrSlug) : await eventsRepository.findById(idOrSlug);
    if (!row) throw new AppError(404, "EVENT_NOT_FOUND", "Evento não encontrado");
    let myRegistration: "registered" | "checked_in" | "cancelled" | null = null;
    if (user) {
      const reg = await eventsRepository.findRegistrationByEventAndUser(row.id, user.id);
      if (reg) myRegistration = reg.status as "registered" | "checked_in" | "cancelled";
    }
    return { ...row, myRegistration };
  },

  async updateEvent(user: AuthUser, id: string, input: UpdateEventInput) {
    const existing = await eventsRepository.findById(id);
    if (!existing) throw new AppError(404, "EVENT_NOT_FOUND", "Evento não encontrado");
    await ensureOrganizerProfile(user, existing.organizerProfileId);

    const patch: Partial<{
      id: string;
      organizerProfileId: string;
      categoryId: string | null;
      title: string;
      slug: string;
      description: string;
      startAt: Date;
      endAt: Date;
      isOnline: boolean;
      onlineUrl: string | null;
      venueName: string | null;
      province: string | null;
      district: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      coverImage: string | null;
      capacity: number | null;
      status: "draft" | "published" | "cancelled" | "ended";
      createdAt: Date;
      updatedAt: Date;
    }> = {};

    if (input.organizerProfileId !== undefined) {
      await ensureOrganizerProfile(user, input.organizerProfileId);
      patch.organizerProfileId = input.organizerProfileId;
    }
    if (input.categoryId !== undefined) patch.categoryId = input.categoryId ?? null;
    if (input.title !== undefined) {
      patch.title = input.title;
      if (input.title !== existing.title) patch.slug = await uniqueSlug(slugify(input.title));
    }
    if (input.description !== undefined) patch.description = input.description;
    if (input.startAt !== undefined) patch.startAt = input.startAt;
    if (input.endAt !== undefined) patch.endAt = input.endAt;
    if (input.isOnline !== undefined) patch.isOnline = input.isOnline;
    if (input.onlineUrl !== undefined) patch.onlineUrl = input.onlineUrl ?? null;
    if (input.venueName !== undefined) patch.venueName = input.venueName ?? null;
    if (input.province !== undefined) patch.province = input.province ?? null;
    if (input.district !== undefined) patch.district = input.district ?? null;
    if (input.address !== undefined) patch.address = input.address ?? null;
    if (input.latitude !== undefined) patch.latitude = input.latitude ?? null;
    if (input.longitude !== undefined) patch.longitude = input.longitude ?? null;
    if (input.coverImage !== undefined) patch.coverImage = input.coverImage ?? null;
    if (input.capacity !== undefined) patch.capacity = input.capacity ?? null;
    if (input.status !== undefined && input.status !== existing.status) patch.status = input.status;

    if (Object.keys(patch).length === 0) return existing;
    return eventsRepository.update(id, patch);
  },

  // ── Inscrições ───────────────────────────────────────────────────
  async register(eventRow: { id: string; capacity: number | null; status: string; startAt: Date }, user: AuthUser) {
    if (eventRow.status !== "published") throw new AppError(409, "EVENT_NOT_OPEN", "Evento não está aberto a inscrições");
    if (eventRow.startAt <= new Date()) throw new AppError(409, "EVENT_STARTED", "O evento já começou");
    const existing = await eventsRepository.findRegistrationByEventAndUser(eventRow.id, user.id);
    if (existing) throw new AppError(409, "ALREADY_REGISTERED", "Já estás inscrito neste evento");
    if (eventRow.capacity != null) {
      const active = await eventsRepository.countActiveRegistrations(eventRow.id);
      if (active >= eventRow.capacity) throw new AppError(409, "EVENT_FULL", "Evento sem vagas");
    }
    return eventsRepository.createRegistration(eventRow.id, user.id);
  },

  async myRegistrations(user: AuthUser, query: EventRegistrationListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await eventsRepository.listRegistrationsByUser(user.id, query.status, page, limit);
    return { items, total, page, limit };
  },

  async listRegistrations(user: AuthUser, eventId: string, query: EventRegistrationListQuery) {
    const eventRow = await eventsRepository.findById(eventId);
    if (!eventRow) throw new AppError(404, "EVENT_NOT_FOUND", "Evento não encontrado");
    await ensureOrganizerProfile(user, eventRow.organizerProfileId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await eventsRepository.listRegistrations(eventId, query.status, page, limit);
    return { items, total, page, limit };
  },

  async updateRegistration(user: AuthUser, registrationId: string, status: "cancelled" | "checked_in") {
    const registration = await eventsRepository.findRegistrationById(registrationId);
    if (!registration) throw new AppError(404, "REGISTRATION_NOT_FOUND", "Inscrição não encontrada");
    const eventRow = await eventsRepository.findById(registration.eventId);
    if (!eventRow) throw new AppError(404, "EVENT_NOT_FOUND", "Evento não encontrado");

    // O organizador pode confirmar/cancelar qualquer inscrição; o inscrito pode cancelar a sua.
    const isOrganizer = (await tasksRepository.getUserProfileIds(user.id)).includes(eventRow.organizerProfileId);
    if (status === "checked_in" && !isOrganizer) throw new AppError(403, "FORBIDDEN", "Só o organizador pode confirmar presenças");
    if (!isOrganizer && registration.userId !== user.id) throw new AppError(403, "FORBIDDEN", "Sem permissão para alterar esta inscrição");

    if (status === "cancelled" && registration.status === "cancelled") {
      throw new AppError(409, "INVALID_TRANSITION", "Inscrição já cancelada");
    }
    if (status === "checked_in" && registration.status !== "registered") {
      throw new AppError(409, "INVALID_TRANSITION", "Só inscrições activas podem ser confirmadas");
    }
    return eventsRepository.updateRegistration(registrationId, status);
  },

  async cancelMyRegistration(eventId: string, user: AuthUser) {
    // Permite ao organizador remover uma inscrição, ou a um inscrito cancelar a sua.
    const existing = await eventsRepository.findRegistrationByEventAndUser(eventId, user.id);
    if (existing) {
      if (existing.status === "cancelled") throw new AppError(409, "INVALID_TRANSITION", "Inscrição já cancelada");
      const updated = await eventsRepository.updateRegistration(existing.id, "cancelled");
      return { cancelled: true, registration: updated };
    }
    const eventRow = await eventsRepository.findById(eventId);
    if (!eventRow) throw new AppError(404, "EVENT_NOT_FOUND", "Evento não encontrado");
    throw new AppError(404, "REGISTRATION_NOT_FOUND", "Inscrição não encontrada");
  },
};