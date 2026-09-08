import { z } from "zod";
import { ORG_ROLES } from "../types.js";

// ── Enums de domínio ───────────────────────────────────────────────────────

export const OPERATING_SCOPES = ["national", "provincial", "district", "local"] as const;
export type InstitutionOperatingScope = (typeof OPERATING_SCOPES)[number];

export const operatingScopeLabels: Record<InstitutionOperatingScope, string> = {
  national: "Âmbito nacional",
  provincial: "Âmbito provincial",
  district: "Âmbito distrital",
  local: "Âmbito local",
};

// A equipa de gestão da instituição reutiliza os papéis de organização
// (owner/admin/editor/member) — ver INSTITUTION_MANAGER_PERMISSIONS.
export const institutionManagerRoleSchema = z.enum(ORG_ROLES);
export type InstitutionManagerRole = z.infer<typeof institutionManagerRoleSchema>;

export const INSTITUTION_TYPES = [
  "association",
  "chamber_of_commerce",
  "ngo",
  "foundation",
  "cooperative",
  "union",
  "professional_body",
  "educational",
  "religious",
  "public_body",
  "other",
] as const;
export type InstitutionType = (typeof INSTITUTION_TYPES)[number];

export const institutionTypeLabels: Record<InstitutionType, string> = {
  association: "Associação",
  chamber_of_commerce: "Câmara de Comércio",
  ngo: "ONG",
  foundation: "Fundação",
  cooperative: "Cooperativa",
  union: "Sindicato",
  professional_body: "Ordem / Conselho Profissional",
  educational: "Instituição de Ensino",
  religious: "Organização Religiosa",
  public_body: "Entidade Pública",
  other: "Outra",
};

export const MEMBERSHIP_TYPES = ["member", "partner", "associate", "affiliate", "other"] as const;
export type MembershipType = (typeof MEMBERSHIP_TYPES)[number];

export const membershipTypeLabels: Record<MembershipType, string> = {
  member: "Membro",
  partner: "Parceiro",
  associate: "Associado",
  affiliate: "Afiliado",
  other: "Outro",
};

export const MEMBERSHIP_STATUSES = ["pending", "approved", "rejected", "revoked", "verified", "expired"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const membershipStatusLabels: Record<MembershipStatus, string> = {
  pending: "Pendente",
  approved: "Confirmada",
  rejected: "Rejeitada",
  revoked: "Revogada",
  verified: "Verificada",
  expired: "Expirada",
};

// Instituições não passam por "pre_registered" — subset de verification_status
export const institutionVerificationStatusSchema = z.enum(["pending", "in_review", "verified", "suspended", "expired"]);
export type InstitutionVerificationStatus = z.infer<typeof institutionVerificationStatusSchema>;

// ── Schemas ────────────────────────────────────────────────────────────────

export const institutionEnums = {
  organizationType: z.enum(INSTITUTION_TYPES),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  membershipStatus: z.enum(MEMBERSHIP_STATUSES),
};

const institutionContactFields = {
  legalName: z.string().trim().max(200).nullable().optional(),
  website: z.string().trim().url().max(255).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  whatsapp: z.string().trim().max(32).nullable().optional(),
  province: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  foundedAt: z.coerce.date().nullable().optional(),
};

const institutionProfileFields = {
  tagline: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  logoUrl: z.string().trim().url().max(512).nullable().optional(),
  coverUrl: z.string().trim().url().max(512).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  categoryIds: z.array(z.string().min(1)).max(5).optional(),
};

export const institutionSocialLinksSchema = z
  .object({
    facebook: z.string().trim().url().max(255).nullable().optional(),
    instagram: z.string().trim().url().max(255).nullable().optional(),
    linkedin: z.string().trim().url().max(255).nullable().optional(),
    youtube: z.string().trim().url().max(255).nullable().optional(),
    x: z.string().trim().url().max(255).nullable().optional(),
    tiktok: z.string().trim().url().max(255).nullable().optional(),
  })
  .strict()
  .nullable()
  .optional();

export const institutionPrimaryContactSchema = z
  .object({
    name: z.string().trim().max(120),
    role: z.string().trim().max(120).nullable().optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .strict()
  .nullable()
  .optional();

export const institutionVerificationDocumentSchema = z.object({
  id: z.string().min(1),
  fileId: z.string().min(1),
  type: z.string().trim().max(48),
  filename: z.string().trim().max(255),
  uploadedAt: z.coerce.date(),
});
export const institutionVerificationDocumentsSchema = z.array(institutionVerificationDocumentSchema).max(20).nullable().optional();

// Campos específicos do domínio institucional — partilhados no create/update
const institutionDomainFields = {
  acronym: z.string().trim().max(24).nullable().optional(),
  taxId: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "NUIT deve ter exactamente 9 dígitos")
    .nullable()
    .optional(),
  mission: z.string().trim().max(2000).nullable().optional(),
  vision: z.string().trim().max(2000).nullable().optional(),
  operatingScope: z.enum(OPERATING_SCOPES).nullable().optional(),
  socialLinks: institutionSocialLinksSchema,
  primaryContact: institutionPrimaryContactSchema,
};

// Criação — admin console (Fase 1) ou autosserviço (instituição dona)
export const institutionCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens")
    .max(64)
    .optional(),
  organizationType: z.enum(INSTITUTION_TYPES),
  status: z.enum(["draft", "active"]).optional(),
  verificationStatus: institutionVerificationStatusSchema.optional(),
  ...institutionContactFields,
  ...institutionProfileFields,
  ...institutionDomainFields,
});

// Edição — admin console
export const institutionUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e hífens")
    .max(64)
    .optional(),
  organizationType: z.enum(INSTITUTION_TYPES).optional(),
  status: z.enum(["draft", "active", "suspended"]).optional(),
  ...institutionContactFields,
  ...institutionProfileFields,
  ...institutionDomainFields,
});

// Listagem pública / directório
export const institutionsListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  organizationType: z.enum(INSTITUTION_TYPES).optional(),
  operatingScope: z.enum(OPERATING_SCOPES).optional(),
  categoryId: z.string().min(1).optional(),
  tagSlug: z.string().trim().max(64).optional(),
  province: z.string().trim().max(80).optional(),
  near: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, "near deve ser 'lat,lng'")
    .optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).default(25).optional(),
  // Filtro "Associações": devolve instituições onde a empresa tem membership
  // aprovada/verificada (usado no perfil público da empresa).
  companyProfileId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12).optional(),
  sort: z.enum(["recent", "name", "members", "distance"]).default("recent").optional(),
});

export const institutionMembershipRequestSchema = z.object({
  companyProfileId: z.string().min(1),
  membershipType: z.enum(MEMBERSHIP_TYPES).default("member").optional(),
});

// Admin — listas
export const adminInstitutionsListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  organizationType: z.enum(INSTITUTION_TYPES).optional(),
  operatingScope: z.enum(OPERATING_SCOPES).optional(),
  status: z.enum(["draft", "active", "suspended"]).optional(),
  verificationStatus: institutionVerificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(20).optional(),
});

export const adminInstitutionMembershipsQuerySchema = z.object({
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50).optional(),
});

export const institutionMembershipActionSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

// ── Autosserviço (instituições donas) ─────────────────────────────────────

export const institutionManagerInviteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "editor", "member"]),
});

export const institutionManagerUpdateSchema = z.object({
  role: z.enum(["owner", "admin", "editor", "member"]),
});

export const institutionManagerRowSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  role: z.enum(["owner", "admin", "editor", "member"]),
  createdAt: z.date(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
  }),
});

export const institutionsMineQuerySchema = z.object({
  status: z.enum(["draft", "active", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

// ── Views ──────────────────────────────────────────────────────────────────

export const institutionListItemSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  organizationType: z.enum(INSTITUTION_TYPES),
  verificationStatus: institutionVerificationStatusSchema,
  operatingScope: z.enum(OPERATING_SCOPES).nullable().optional(),
  acronym: z.string().nullable().optional(),
  province: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  foundedYear: z.number().nullable().optional(),
  membersCount: z.number(),
  verifiedMembersCount: z.number(),
  categories: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string(), isPrimary: z.boolean() })),
  badges: z.array(z.object({ slug: z.string(), name: z.string(), type: z.string() })),
});

export const institutionMemberViewSchema = z.object({
  id: z.string(),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  status: z.enum(MEMBERSHIP_STATUSES),
  joinedAt: z.date().nullable(),
  verifiedAt: z.date().nullable(),
  company: z.object({
    slug: z.string(),
    name: z.string(),
    logoUrl: z.string().nullable(),
    tagline: z.string().nullable(),
    province: z.string().nullable(),
  }),
});

export const institutionPublicViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  tagline: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  organizationType: z.enum(INSTITUTION_TYPES),
  verificationStatus: institutionVerificationStatusSchema,
  verifiedAt: z.date().nullable(),
  foundedAt: z.date().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  province: z.string().nullable(),
  district: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  acronym: z.string().nullable().optional(),
  operatingScope: z.enum(OPERATING_SCOPES).nullable().optional(),
  mission: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  socialLinks: institutionSocialLinksSchema,
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  status: z.enum(["draft", "active", "suspended"]),
  categories: z.array(z.object({ id: z.string(), slug: z.string(), name: z.string(), isPrimary: z.boolean() })),
  badges: z.array(z.object({ slug: z.string(), name: z.string(), type: z.string() })),
  membersCount: z.number(),
  verifiedMembersCount: z.number(),
  members: z.array(institutionMemberViewSchema),
});

export const institutionAdminRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  profileId: z.string(),
  legalName: z.string().nullable(),
  organizationType: z.enum(INSTITUTION_TYPES),
  status: z.enum(["draft", "active", "suspended"]),
  verificationStatus: institutionVerificationStatusSchema,
  verifiedAt: z.date().nullable(),
  website: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  province: z.string().nullable(),
  district: z.string().nullable().optional(),
  city: z.string().nullable(),
  address: z.string().nullable().optional(),
  foundedAt: z.date().nullable(),
  acronym: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  mission: z.string().nullable().optional(),
  vision: z.string().nullable().optional(),
  operatingScope: z.enum(OPERATING_SCOPES).nullable().optional(),
  socialLinks: institutionSocialLinksSchema,
  primaryContact: institutionPrimaryContactSchema,
  verificationDocuments: institutionVerificationDocumentsSchema,
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable().optional(),
  tagline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  createdByEmail: z.string().nullable().optional(),
  membersCount: z.number(),
  verifiedMembersCount: z.number(),
  createdAt: z.date(),
});

export const institutionMembershipAdminRowSchema = z.object({
  id: z.string(),
  institutionId: z.string(),
  membershipType: z.enum(MEMBERSHIP_TYPES),
  status: z.enum(MEMBERSHIP_STATUSES),
  requestedByName: z.string().nullable().optional(),
  approvedAt: z.date().nullable(),
  verifiedAt: z.date().nullable(),
  joinedAt: z.date().nullable(),
  createdAt: z.date(),
  company: z.object({
    profileId: z.string(),
    slug: z.string(),
    name: z.string(),
    logoUrl: z.string().nullable(),
    province: z.string().nullable(),
  }),
});

// ── Tipos ──────────────────────────────────────────────────────────────────

export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;
export type InstitutionUpdateInput = z.infer<typeof institutionUpdateSchema>;
export type InstitutionsListQuery = z.infer<typeof institutionsListQuerySchema>;
export type InstitutionMembershipRequestInput = z.infer<typeof institutionMembershipRequestSchema>;
export type AdminInstitutionsListQuery = z.infer<typeof adminInstitutionsListQuerySchema>;
export type AdminInstitutionMembershipsQuery = z.infer<typeof adminInstitutionMembershipsQuerySchema>;
export type InstitutionMembershipActionInput = z.infer<typeof institutionMembershipActionSchema>;
export type InstitutionListItem = z.infer<typeof institutionListItemSchema>;
export type InstitutionMemberView = z.infer<typeof institutionMemberViewSchema>;
export type InstitutionPublicView = z.infer<typeof institutionPublicViewSchema>;
export type InstitutionAdminRow = z.infer<typeof institutionAdminRowSchema>;
export type InstitutionMembershipAdminRow = z.infer<typeof institutionMembershipAdminRowSchema>;
export type InstitutionManagerInviteInput = z.infer<typeof institutionManagerInviteSchema>;
export type InstitutionManagerUpdateInput = z.infer<typeof institutionManagerUpdateSchema>;
export type InstitutionManagerRow = z.infer<typeof institutionManagerRowSchema>;
export type InstitutionsMineQuery = z.infer<typeof institutionsMineQuerySchema>;