export interface TenderListItem {
  reference: string;
  type: string;
  category: string;
  object: string;
  ugea: string;
  province: string;
  launchedAt: Date | null;
  openedAt: Date | null;
  detailsUrl: string;
}

export interface TenderDetails {
  regime: string | null;
  modality: string | null;
  class: string | null;
  generalObject: string | null;
  currency: string | null;
  estimatedValue: number | null;
  provisionalGuarantee: number | null;
  awardCriteria: string | null;
  lotCount: string | null;
  proposalDelivery: string | null;
  deliveryTime: string | null;
  openingTime: string | null;
  observations: string | null;
  publishedAt: Date | null;
  openedAt: Date | null;
  launchedAt: Date | null;
  noticeUrl: string | null;
  documentUrl: string | null;
}