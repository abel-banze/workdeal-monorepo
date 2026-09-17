import type { TenderListQuery, TenderView } from "@workdeal/shared";
import { AppError } from "../lib/errors.js";
import { tendersRepository } from "../repositories/tenders.repository.js";

function toView(row: Awaited<ReturnType<typeof tendersRepository.findByIdOrReference>>): TenderView {
  if (!row) return row as never;
  return {
    id: row.id,
    source: row.source,
    reference: row.reference,
    ugeaId: row.ugeaId,
    ugeaSlug: row.ugeaSlug,
    type: row.type,
    category: row.category,
    object: row.object,
    province: row.province,
    launchedAt: row.launchedAt,
    openedAt: row.openedAt,
    detailsUrl: row.detailsUrl,
    regime: row.regime,
    modality: row.modality,
    class: row.class,
    generalObject: row.generalObject,
    currency: row.currency,
    estimatedValue: row.estimatedValue,
    provisionalGuarantee: row.provisionalGuarantee,
    awardCriteria: row.awardCriteria,
    lotCount: row.lotCount,
    proposalDelivery: row.proposalDelivery,
    deliveryTime: row.deliveryTime,
    openingTime: row.openingTime,
    observations: row.observations,
    publishedAt: row.publishedAt,
    description: row.description,
    status: row.status,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    ugeaName: row.ugeaName,
  };
}

export const tendersService = {
  async list(query: TenderListQuery) {
    return tendersRepository.list(query);
  },

  async getByIdOrReference(idOrReference: string) {
    const row = await tendersRepository.findByIdOrReference(idOrReference);
    if (!row) {
      throw new AppError(404, "TENDER_NOT_FOUND", "Concurso não encontrado");
    }
    const view = toView(row);
    view.documents = await tendersRepository.documentsFor(row.id);
    return view;
  },
};