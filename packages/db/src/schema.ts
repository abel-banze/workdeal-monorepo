import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  uuid,
  jsonb,
  smallint,
  doublePrecision,
  integer,
  primaryKey,
  customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { isNotNull, isNull } from "drizzle-orm";

export const systemRoleEnum = pgEnum("system_role", ["user", "moderator", "admin"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "editor", "member"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pre_registered", "pending", "in_review", "verified", "suspended", "expired"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "rejected", "canceled"]);
export const adminInviteStatusEnum = pgEnum("admin_invite_status", ["pending", "accepted", "revoked", "expired"]);

// PostGIS geography(Point,4326). O drizzle-kit (v0.31) não sabe emitir tipos
// parametrizados: `dataType()` com "geography(Point, 4326)" gera SQL inválido
// (`"geography(Point, 4326)"`), tal como `"undefined"."geography(Point,4326)"`
// nas migrações antigas. Por isso o customType devolve o tipo base "geography"
// (sem typmod), que o `push`/`generate` emitem como `"geography"` — SQL válido,
// compatível com `ST_Distance`/`ST_DWithin` usando `::geography`. Todos os valores
// são gravados via `ST_MakePoint(lng,lat)::geography`, logo o SRID/Point é mantido
// de facto mesmo sem o typmod explícito. O índice GIST é criado por migração SQL.
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography";
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value) {
    return value as string;
  },
});


export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    systemRole: systemRoleEnum("system_role").notNull().default("user"),
    phone: text("phone"),
    locale: text("locale").notNull().default("pt-MZ"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("user_email_idx").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    activeOrganizationId: text("active_organization_id"),
  },
  (table) => [index("session_user_id_idx").on(table.userId), index("session_token_idx").on(table.token)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
  },
  (table) => [
    uniqueIndex("account_provider_account_idx").on(table.providerId, table.accountId),
    index("account_user_id_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    identifier: text("identifier").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const organization = pgTable(
  "organization",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at"),
    // Pré-registo (promoter) — empresa recolhida, ainda sem conta no Workdeal
    preRegisteredAt: timestamp("pre_registered_at"),
    preRegisteredBy: text("pre_registered_by").references(() => user.id),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    completionToken: text("completion_token"),
    completionTokenExpiresAt: timestamp("completion_token_expires_at"),
  },
  (table) => [
    index("organization_slug_idx").on(table.slug),
    index("organization_completion_token_idx").on(table.completionToken),
    index("organization_pre_registered_idx").on(table.verificationStatus),
  ],
);

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("member_organization_user_idx").on(table.organizationId, table.userId),
    index("member_user_id_idx").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at").notNull(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("invitation_organization_id_idx").on(table.organizationId)],
);

// Convites para a equipa do painel administrativo (moderador/admin).
// O convidado aceita com a conta Workdeal existente (o email tem de bater).
export const adminInvite = pgTable(
  "admin_invite",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: systemRoleEnum("role").notNull().default("moderator"),
    status: adminInviteStatusEnum("status").notNull().default("pending"),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("admin_invite_email_idx").on(table.email),
    index("admin_invite_status_idx").on(table.status),
  ],
);

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const profileTypeEnum = pgEnum("profile_type", ["individual", "company", "institution"]);
export const profileStatusEnum = pgEnum("profile_status", ["draft", "active", "suspended"]);
export const badgeTypeEnum = pgEnum("badge_type", [
  "trust",
  "quality",
  "activity",
  "reputation",
  "specialization",
  "network",
  "performance",
  "commercial",
  "promotional",
  "informational",
]);
export const badgeOriginEnum = pgEnum("badge_origin", ["automatic", "manual", "paid"]);
export const badgeStatusEnum = pgEnum("badge_status", ["active", "revoked"]);
export const reviewOriginEnum = pgEnum("review_origin", ["directory", "task", "event"]);
export const verificationRequestStatusEnum = pgEnum("verification_request_status", ["pending", "in_review", "approved", "rejected"]);
export const verificationLevelEnum = pgEnum("verification_level", ["level1", "level2"]);
export const reportTargetTypeEnum = pgEnum("report_target_type", ["profile", "review", "task", "event"]);
export const reportStatusEnum = pgEnum("report_status", ["pending", "resolved", "dismissed"]);
export const companySizeEnum = pgEnum("company_size", ["micro", "pequena", "media", "grande"]);
export const legalFormEnum = pgEnum("legal_form", ["lda", "su", "unipessoal", "cooperativa", "outro"]);

// ── Instituições / Organizações (associações, câmaras, ONGs, ...) ────────
// Domínio distinto de `organization` (melhor-auth/equipas de empresa).
// Cada instituição tem um `profile` ligado (type='institution', 1:1) que
// carrega identidade pública (slug, nome, logo, geo, categorias, busca).
export const institutionTypeEnum = pgEnum("institution_type", [
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
]);
export const membershipTypeEnum = pgEnum("membership_type", ["member", "partner", "associate", "affiliate", "other"]);
export const membershipStatusEnum = pgEnum("membership_status", ["pending", "approved", "rejected", "revoked", "verified", "expired"]);
export const institutionOperatingScopeEnum = pgEnum("institution_operating_scope", ["national", "provincial", "district", "local"]);

export const category = pgTable(
  "category",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id").references((): AnyPgColumn => category.id, { onDelete: "set null" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("category_slug_idx").on(table.slug)],
);

export const profile = pgTable(
  "profile",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: profileTypeEnum("type").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // PostGIS geography(Point,4326) — mantido em sincronia com latitude/longitude
    // via trigger/migração SQL (ver 0002_enable_postgis.sql, 0014_reactivate_postgis.sql,
    // e o índice GIST profile_geom_gist_idx criado por migração).
    geom: geographyPoint("geom"),
    // tsvector GENERATED STORED (pesos A/B/C) + unaccent portuguese — ver 0029_search_tsv_generated.sql
    // Colunas denormalizadas mantêm categoria/location na mesma linha para GENERATED (sem subquery)
    searchTsv: text("search_tsv"),
    searchCategoryText: text("search_category_text"),
    searchLocationText: text("search_location_text"),
    searchTagText: text("search_tag_text"),
    whatsapp: text("whatsapp"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    googlePlaceId: text("google_place_id"),
    formattedAddress: text("formatted_address"),
    businessHours: jsonb("business_hours"),
    status: profileStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("profile_user_id_idx").on(table.userId),
    uniqueIndex("profile_organization_id_idx").on(table.organizationId),
    index("profile_type_status_idx").on(table.type, table.status),
    index("profile_geo_idx").on(table.latitude, table.longitude),
    index("profile_geom_gist_idx").using("gist", table.geom),
    index("profile_slug_idx").on(table.slug),
  ],
);

// Perfil institucional ligado 1:1 à instituição. O `profile` é a identidade
// pública (slug, nome, logo, geo, categorias/tags, busca, badges) — a tabela
// `institution` guarda apenas dados específicos do domínio.
export const institution = pgTable(
  "institution",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .unique()
      .references(() => profile.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    legalName: text("legal_name"),
    organizationType: institutionTypeEnum("organization_type").notNull(),
    foundedAt: timestamp("founded_at"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    province: text("province"),
    district: text("district"),
    city: text("city"),
    address: text("address"),
    // Campos de domínio institucional (Etapa 1)
    acronym: text("acronym"),
    taxId: text("tax_id").unique(),
    mission: text("mission"),
    vision: text("vision"),
    operatingScope: institutionOperatingScopeEnum("operating_scope"),
    socialLinks: jsonb("social_links"),
    primaryContact: jsonb("primary_contact"),
    verificationDocuments: jsonb("verification_documents"),
    status: profileStatusEnum("status").notNull().default("draft"),
    verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("institution_slug_idx").on(table.slug),
    index("institution_type_idx").on(table.organizationType),
    index("institution_status_idx").on(table.status),
    index("institution_verification_idx").on(table.verificationStatus),
    index("institution_operating_scope_idx").on(table.operatingScope),
  ],
);

// Empresa (profile type='company') → instituição. Membership com verificação:
// `approved` = "declara ser membro"; `verified` = "membro verificado" (Workdeal).
export const institutionMembership = pgTable(
  "institution_membership",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institution.id, { onDelete: "cascade" }),
    companyProfileId: text("company_profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    membershipType: membershipTypeEnum("membership_type").notNull().default("member"),
    status: membershipStatusEnum("status").notNull().default("pending"),
    requestedById: text("requested_by_id").references(() => user.id, { onDelete: "set null" }),
    approvedById: text("approved_by_id").references(() => user.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at"),
    verifiedById: text("verified_by_id").references(() => user.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at"),
    joinedAt: timestamp("joined_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("institution_membership_inst_company_idx").on(table.institutionId, table.companyProfileId),
    index("institution_membership_institution_status_idx").on(table.institutionId, table.status),
    index("institution_membership_company_status_idx").on(table.companyProfileId, table.status),
    index("institution_membership_requested_by_idx").on(table.requestedById),
  ],
);

// Equipa de gestão da instituição (autosserviço). Ao contrário do `member` do
// better-auth (que pertence a organizações), aqui o papel é por instituição e
// reutiliza os papéis org_role (owner/admin/editor/member) para a matriz de
// permissões INSTITUTION_MANAGER_PERMISSIONS em packages/shared.
export const institutionManager = pgTable(
  "institution_manager",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    institutionId: text("institution_id")
      .notNull()
      .references(() => institution.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull().default("editor"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("institution_manager_institution_user_idx").on(table.institutionId, table.userId),
    index("institution_manager_user_idx").on(table.userId),
  ],
);

export const profileCategory = pgTable(
  "profile_category",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.categoryId] }),
    index("profile_category_category_id_idx").on(table.categoryId),
  ],
);

export const badge = pgTable("badge", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: badgeTypeEnum("type").notNull(),
  origin: badgeOriginEnum("origin").notNull(),
  criteria: text("criteria"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const profileBadge = pgTable(
  "profile_badge",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badge.id, { onDelete: "cascade" }),
    origin: badgeOriginEnum("origin").notNull(),
    status: badgeStatusEnum("status").notNull().default("active"),
    awardedAt: timestamp("awarded_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
    awardedByUserId: text("awarded_by_user_id").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.badgeId] }),
    index("profile_badge_badge_id_idx").on(table.badgeId),
    index("profile_badge_status_idx").on(table.profileId, table.status),
  ],
);

export const review = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    origin: reviewOriginEnum("origin").notNull().default("directory"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("review_profile_author_origin_idx").on(table.profileId, table.authorUserId, table.origin),
    index("review_profile_id_idx").on(table.profileId),
  ],
);

export const follow = pgTable(
  "follow",
  {
    followerUserId: text("follower_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerUserId, table.profileId] }),
    index("follow_profile_id_idx").on(table.profileId),
  ],
);

export const profileBookmark = pgTable(
  "profile_bookmark",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Quem guardou (sempre preenchido, mesmo em guardados da empresa)
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Âmbito do guardado: NULL = conta pessoal; preenchido = empresa.
    // O guardado da empresa é partilhado por todos os membros.
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("profile_bookmark_profile_idx").on(table.profileId),
    index("profile_bookmark_org_idx").on(table.organizationId),
    // Pessoal: um guardado por (utilizador, perfil)
    uniqueIndex("profile_bookmark_personal_uidx")
      .on(table.userId, table.profileId)
      .where(isNull(table.organizationId)),
    // Empresa: um guardado por (perfil, empresa), independentemente de quem guardou
    uniqueIndex("profile_bookmark_org_uidx")
      .on(table.profileId, table.organizationId)
      .where(isNotNull(table.organizationId)),
  ],
);

export const portfolioItem = pgTable(
  "portfolio_item",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("portfolio_item_profile_id_idx").on(table.profileId)],
);

export const service = pgTable(
  "service",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    priceMzn: integer("price_mzn"),
    imageUrl: text("image_url"),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("service_profile_id_idx").on(table.profileId), index("service_category_id_idx").on(table.categoryId)],
);

export const verificationRequest = pgTable(
  "verification_request",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    status: verificationRequestStatusEnum("status").notNull().default("pending"),
    level: verificationLevelEnum("level").notNull().default("level1"),
    documents: jsonb("documents").notNull().default([]),
    // Estatutos / BR (Boletim da República) — número de publicação do registo
    brNumber: text("br_number"),
    // Comprovativo do pagamento do plano Workdeal Trust (Millennium BIM)
    paymentProof: jsonb("payment_proof"),
    reviewerUserId: text("reviewer_user_id").references(() => user.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("verification_request_profile_id_idx").on(table.profileId)],
);

export const report = pgTable(
  "report",
  {
    id: text("id").primaryKey(),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: reportTargetTypeEnum("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    status: reportStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("report_target_idx").on(table.targetType, table.targetId),
    index("report_status_idx").on(table.status),
  ],
);

export const companyQualification = pgTable(
  "company_qualification",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: "cascade" }),
    profileId: text("profile_id").references(() => profile.id, { onDelete: "set null" }),
    companySize: companySizeEnum("company_size").notNull(),
    workers: integer("workers").notNull(),
    turnoverMzn: integer("turnover_mzn"),
    foundedYear: integer("founded_year"),
    legalForm: legalFormEnum("legal_form"),
    nuit: text("nuit"),
    alvara: text("alvara"),
    capitalSocialMzn: integer("capital_social_mzn"),
    licenses: jsonb("licenses").$type<string[] | null>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("company_qualification_org_idx").on(table.organizationId),
    index("company_qualification_profile_idx").on(table.profileId),
    index("company_qualification_size_idx").on(table.companySize),
  ],
);

export const contactChannelEnum = pgEnum("contact_channel", ["whatsapp", "phone", "email", "website"]);

export const profileContactVerification = pgTable(
  "profile_contact_verification",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    channel: contactChannelEnum("channel").notNull(),
    identifier: text("identifier").notNull(),
    verifiedAt: timestamp("verified_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profile_contact_channel_identifier_idx").on(table.profileId, table.channel, table.identifier),
    index("profile_contact_profile_idx").on(table.profileId),
  ],
);

export const visibilityEnum = pgEnum("visibility", ["exact", "zone"]);

export const profileLocation = pgTable(
  "profile_location",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "cascade" }),
    label: text("label"),
    province: text("province").notNull(),
    district: text("district"),
    bairro: text("bairro"),
    address: text("address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // PostGIS geography(Point,4326) — índice GIST profile_location_geom_gist_idx via migração SQL
    geom: geographyPoint("geom"),
    googlePlaceId: text("google_place_id"),
    isPrimary: boolean("is_primary").notNull().default(false),
    visibility: visibilityEnum("visibility").notNull().default("zone"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("profile_location_profile_idx").on(table.profileId),
    index("profile_location_org_idx").on(table.organizationId),
    index("profile_location_province_idx").on(table.province),
    index("profile_location_geo_idx").on(table.latitude, table.longitude),
    index("profile_location_geom_gist_idx").using("gist", table.geom),
  ],
);

export const tag = pgTable(
  "tag",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("tag_slug_idx").on(table.slug)],
);

export const profileTag = pgTable(
  "profile_tag",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.profileId, table.tagId] }), index("profile_tag_tag_idx").on(table.tagId)],
);

export const quoteStatusEnum = pgEnum("quote_status", ["pending", "viewed", "quoted", "declined", "closed"]);

export const quoteRequest = pgTable(
  "quote_request",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    targetProfileId: text("target_profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    requesterUserId: text("requester_user_id").references(() => user.id, { onDelete: "cascade" }),
    requesterOrganizationId: text("requester_organization_id").references(() => organization.id, { onDelete: "set null" }),
    serviceLabel: text("service_label").notNull(),
    serviceTag: text("service_tag"),
    portfolioItemId: text("portfolio_item_id").references(() => portfolioItem.id, { onDelete: "set null" }),
    message: text("message").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    status: quoteStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("quote_request_target_idx").on(table.targetProfileId),
    index("quote_request_requester_idx").on(table.requesterUserId),
    index("quote_request_status_idx").on(table.status),
    index("quote_request_created_idx").on(table.createdAt),
  ],
);

export const file = pgTable(
  "file",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    resourceType: text("resource_type").notNull(),
    format: text("format"),
    bytes: integer("bytes"),
    originalFilename: text("original_filename"),
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("file_uploaded_by_idx").on(table.uploadedByUserId),
    index("file_created_idx").on(table.createdAt),
  ],
);

export const quoteFile = pgTable(
  "quote_file",
  {
    quoteRequestId: text("quote_request_id")
      .notNull()
      .references(() => quoteRequest.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => file.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.quoteRequestId, table.fileId] }),
    index("quote_file_quote_idx").on(table.quoteRequestId),
    index("quote_file_file_idx").on(table.fileId),
  ],
);

export const otpChallenge = pgTable(
  "otp_challenge",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    channel: text("channel").notNull(),
    identifier: text("identifier").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("otp_challenge_identifier_idx").on(table.channel, table.identifier, table.createdAt),
  ],
);

export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "page_view",
  "contact_click",
  "whatsapp_click",
  "phone_click",
  "email_click",
  "website_click",
  "save",
  "quote_request",
  "search_impression",
]);

export const analyticsEvent = pgTable(
  "analytics_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    profileId: text("profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    visitorId: text("visitor_id"),
    province: text("province"),
    district: text("district"),
    referrer: text("referrer"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("analytics_event_profile_idx").on(table.profileId, table.createdAt),
    index("analytics_event_type_idx").on(table.eventType, table.createdAt),
    index("analytics_event_visitor_idx").on(table.visitorId),
  ],
);

// ── Tasks / Pedidos de serviço ─────────────────────────────────────

export const taskStatusEnum = pgEnum("task_status", ["open", "in_review", "in_progress", "completed", "cancelled", "withdrawn"]);
export const taskContractTypeEnum = pgEnum("task_contract_type", ["service", "recurring", "consulting", "emergency", "project", "public_tender"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["submitted", "shortlisted", "rejected", "withdrawn", "accepted"]);
export const bidStatusEnum = pgEnum("bid_status", ["awarded", "in_progress", "completed", "cancelled", "disputed"]);

export const task = pgTable(
  "task",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requesterOrganizationId: text("requester_organization_id").references(() => organization.id, { onDelete: "set null" }),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    priceMinMzn: integer("price_min_mzn"),
    priceMaxMzn: integer("price_max_mzn"),
    province: text("province"),
    district: text("district"),
    address: text("address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // PostGIS geography(Point,4326) — índice GIST task_geom_gist_idx via migração SQL
    geom: geographyPoint("geom"),
    dueAt: timestamp("due_at"),
    proposalDeadlineAt: timestamp("proposal_deadline_at"),
    attachments: jsonb("attachments").$type<Array<{ fileId: string; url: string; name?: string }> | null>().default([]),
    contractType: taskContractTypeEnum("contract_type"),
    status: taskStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("task_status_created_idx").on(table.status, table.createdAt),
    index("task_category_idx").on(table.categoryId),
    index("task_requester_user_idx").on(table.requesterUserId),
    index("task_geo_idx").on(table.latitude, table.longitude),
    index("task_geom_gist_idx").using("gist", table.geom),
  ],
);

export const taskTag = pgTable(
  "task_tag",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.tagId] }), index("task_tag_tag_idx").on(table.tagId)],
);

export const taskProposal = pgTable(
  "task_proposal",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    providerProfileId: text("provider_profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    priceMzn: integer("price_mzn"),
    estimatedDays: integer("estimated_days"),
    status: proposalStatusEnum("status").notNull().default("submitted"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_proposal_task_provider_idx").on(table.taskId, table.providerProfileId),
    index("task_proposal_provider_idx").on(table.providerProfileId),
    index("task_proposal_status_idx").on(table.status),
  ],
);

export const taskBid = pgTable(
  "task_bid",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => taskProposal.id, { onDelete: "cascade" }),
    providerProfileId: text("provider_profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    requesterUserId: text("requester_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    agreedPriceMzn: integer("agreed_price_mzn").notNull(),
    agreedDeadlineAt: timestamp("agreed_deadline_at"),
    status: bidStatusEnum("status").notNull().default("awarded"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_bid_proposal_idx").on(table.proposalId),
    uniqueIndex("task_bid_task_idx").on(table.taskId),
    index("task_bid_provider_idx").on(table.providerProfileId),
    index("task_bid_requester_idx").on(table.requesterUserId),
    index("task_bid_status_idx").on(table.status),
  ],
);

// ── Eventos ────────────────────────────────────────────────────────

export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "cancelled", "ended"]);
export const eventRegistrationStatusEnum = pgEnum("event_registration_status", ["registered", "cancelled", "checked_in"]);
export const eventVisibilityEnum = pgEnum("event_visibility", ["public", "members_only", "private"]);

export const event = pgTable(
  "event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    organizerProfileId: text("organizer_profile_id")
      .notNull()
      .references(() => profile.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => category.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    startAt: timestamp("start_at").notNull(),
    endAt: timestamp("end_at").notNull(),
    isOnline: boolean("is_online").notNull().default(false),
    onlineUrl: text("online_url"),
    venueName: text("venue_name"),
    province: text("province"),
    district: text("district"),
    address: text("address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    // PostGIS geography(Point,4326) — índice GIST event_geom_gist_idx via migração SQL
    geom: geographyPoint("geom"),
    coverImage: text("cover_image"),
    capacity: integer("capacity"),
    visibility: eventVisibilityEnum("visibility").notNull().default("public"),
    status: eventStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("event_status_start_idx").on(table.status, table.startAt),
    index("event_slug_idx").on(table.slug),
    index("event_organizer_idx").on(table.organizerProfileId),
    index("event_category_idx").on(table.categoryId),
    index("event_geo_idx").on(table.latitude, table.longitude),
    index("event_geom_gist_idx").using("gist", table.geom),
  ],
);

export const eventRegistration = pgTable(
  "event_registration",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    eventId: text("event_id")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: eventRegistrationStatusEnum("status").notNull().default("registered"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("event_registration_event_user_idx").on(table.eventId, table.userId),
    index("event_registration_user_idx").on(table.userId),
    index("event_registration_status_idx").on(table.status),
  ],
);

// ── Subscriptions / Pagamentos ────────────────────────────────
// Ecossistema de billing: planos, subscrições, facturas, pagamentos,
// recibos, cupons de desconto, créditos (wallet) e log de webhooks.

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "trialing", "cancelled", "paused", "expired"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);
export const planIntervalEnum = pgEnum("plan_interval", ["monthly", "quarterly", "yearly"]);

// ── Planos ────────────────────────────────────────────────────
export const plan = pgTable(
  "plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    // Herança de features: plano inclui tudo do plano apontado (Enterprise → Premium → Trust → Free)
    inheritFromPlanId: text("inherit_from_plan_id").references((): AnyPgColumn => plan.id, { onDelete: "set null" }),
    priceMzn: integer("price_mzn").notNull().default(0),
    interval: planIntervalEnum("interval").notNull().default("monthly"),
    trialDays: integer("trial_days").notNull().default(0),
    maxProfiles: integer("max_profiles"),
    maxTeamMembers: integer("max_team_members"),
    maxListings: integer("max_listings"),
    maxBranches: integer("max_branches"),
    apiAccess: boolean("api_access").notNull().default(false),
    maxApiCallsPerMonth: integer("max_api_calls_per_month"),
    isPublic: boolean("is_public").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("plan_slug_idx").on(table.slug),
    index("plan_is_active_idx").on(table.isActive, table.sortOrder),
    index("plan_inherit_idx").on(table.inheritFromPlanId),
  ],
);

export const planFeature = pgTable(
  "plan_feature",
  {
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    featureValue: text("feature_value"),
    label: text("label"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.planId, table.featureKey] }),
    index("plan_feature_key_idx").on(table.featureKey),
  ],
);

// ── Cupons / promoções ────────────────────────────────────────
export const coupon = pgTable(
  "coupon",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    description: text("description"),
    type: couponTypeEnum("type").notNull(),
    value: integer("value").notNull(),
    maxTotalUses: integer("max_total_uses"),
    usedCount: integer("used_count").notNull().default(0),
    maxUsesPerUser: integer("max_uses_per_user").notNull().default(1),
    minAmountMzn: integer("min_amount_mzn"),
    validFrom: timestamp("valid_from"),
    validUntil: timestamp("valid_until"),
    isActive: boolean("is_active").notNull().default(true),
    appliesTo: text("applies_to"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("coupon_code_idx").on(table.code),
    index("coupon_validity_idx").on(table.isActive, table.validFrom, table.validUntil),
  ],
);

// ── Subscrições ───────────────────────────────────────────────
// `userId` obrigatório; `organizationId` opcional (null = subscrição pessoal).
export const subscription = pgTable(
  "subscription",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
    planId: text("plan_id")
      .notNull()
      .references(() => plan.id, { onDelete: "restrict" }),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    trialStartsAt: timestamp("trial_starts_at"),
    trialEndsAt: timestamp("trial_ends_at"),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAt: timestamp("cancel_at"),
    cancelledAt: timestamp("cancelled_at"),
    cancelReason: text("cancel_reason"),
    pausedAt: timestamp("paused_at"),
    resumeAt: timestamp("resume_at"),
    couponId: text("coupon_id").references(() => coupon.id, { onDelete: "set null" }),
    discountMzn: integer("discount_mzn").notNull().default(0),
    provider: text("provider"),
    providerSubscriptionId: text("provider_subscription_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscription_user_status_idx").on(table.userId, table.status),
    index("subscription_org_status_idx").on(table.organizationId, table.status),
    index("subscription_plan_idx").on(table.planId),
    index("subscription_provider_idx").on(table.provider, table.providerSubscriptionId),
  ],
);

export const subscriptionCoupon = pgTable(
  "subscription_coupon",
  {
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscription.id, { onDelete: "cascade" }),
    couponId: text("coupon_id")
      .notNull()
      .references(() => coupon.id, { onDelete: "cascade" }),
    appliedAt: timestamp("applied_at").notNull().defaultNow(),
    discountMzn: integer("discount_mzn").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.subscriptionId, table.couponId] }),
    index("subscription_coupon_coupon_idx").on(table.couponId),
  ],
);

// ── Facturas (uma por ciclo de billing) ───────────────────────
export const invoice = pgTable(
  "invoice",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subscriptionId: text("subscription_id").references(() => subscription.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").references(() => organization.id, { onDelete: "set null" }),
    invoiceNumber: text("invoice_number").notNull().unique(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    subtotalMzn: integer("subtotal_mzn").notNull().default(0),
    discountMzn: integer("discount_mzn").notNull().default(0),
    taxMzn: integer("tax_mzn").notNull().default(0),
    totalMzn: integer("total_mzn").notNull().default(0),
    currency: text("currency").notNull().default("MZN"),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    provider: text("provider"),
    providerInvoiceId: text("provider_invoice_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invoice_number_idx").on(table.invoiceNumber),
    index("invoice_user_status_idx").on(table.userId, table.status),
    index("invoice_subscription_idx").on(table.subscriptionId),
    index("invoice_org_idx").on(table.organizationId),
    index("invoice_period_idx").on(table.periodStart, table.periodEnd),
  ],
);

export const invoiceLineItem = pgTable(
  "invoice_line_item",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
      .notNull()
      .references(() => invoice.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPriceMzn: integer("unit_price_mzn").notNull().default(0),
    totalMzn: integer("total_mzn").notNull().default(0),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("invoice_line_item_invoice_idx").on(table.invoiceId)],
);

// ── Pagamentos / transacções ──────────────────────────────────
export const payment = pgTable(
  "payment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id").references(() => invoice.id, { onDelete: "set null" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountMzn: integer("amount_mzn").notNull(),
    currency: text("currency").notNull().default("MZN"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    method: text("method"),
    provider: text("provider"),
    providerPaymentId: text("provider_payment_id"),
    providerMetadata: jsonb("provider_metadata"),
    paidAt: timestamp("paid_at"),
    refundedAt: timestamp("refunded_at"),
    refundAmountMzn: integer("refund_amount_mzn"),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("payment_user_status_idx").on(table.userId, table.status),
    index("payment_invoice_idx").on(table.invoiceId),
    index("payment_provider_idx").on(table.provider, table.providerPaymentId),
    index("payment_paid_at_idx").on(table.paidAt),
  ],
);

// ── Recibos / comprovativos ───────────────────────────────────
export const receipt = pgTable(
  "receipt",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    paymentId: text("payment_id")
      .notNull()
      .references(() => payment.id, { onDelete: "cascade" }),
    receiptNumber: text("receipt_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountMzn: integer("amount_mzn").notNull(),
    currency: text("currency").notNull().default("MZN"),
    issuedAt: timestamp("issued_at").notNull().defaultNow(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("receipt_number_idx").on(table.receiptNumber),
    index("receipt_user_idx").on(table.userId),
    index("receipt_payment_idx").on(table.paymentId),
  ],
);

// ── Créditos / wallet ─────────────────────────────────────────
export const creditAccount = pgTable(
  "credit_account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    balanceMzn: integer("balance_mzn").notNull().default(0),
    currency: text("currency").notNull().default("MZN"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("credit_account_user_idx").on(table.userId)],
);

export const creditTransaction = pgTable(
  "credit_transaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id")
      .notNull()
      .references(() => creditAccount.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amountMzn: integer("amount_mzn").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    description: text("description"),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_transaction_account_idx").on(table.accountId, table.createdAt),
    index("credit_transaction_reference_idx").on(table.referenceType, table.referenceId),
  ],
);

// ── Webhook events (idempotência) ─────────────────────────────
export const webhookEvent = pgTable(
  "webhook_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("received"),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("webhook_event_provider_external_id_idx").on(table.provider, table.externalId),
    index("webhook_event_status_idx").on(table.provider, table.status),
  ],
);

// ── Programa de afiliados ────────────────────────────────────
// Users ou organizações convidam empresas com código (cupom) ou link; a
// comissão é creditada quando a empresa convidada paga a primeira factura.

export const affiliateActorTypeEnum = pgEnum("affiliate_actor_type", ["user", "organization"]);
export const affiliateCommissionTypeEnum = pgEnum("affiliate_commission_type", ["percent", "fixed"]);
export const affiliateStatusEnum = pgEnum("affiliate_status", ["active", "suspended"]);
export const affiliateReferralSourceEnum = pgEnum("affiliate_referral_source", ["coupon", "link"]);
export const affiliateReferralStatusEnum = pgEnum("affiliate_referral_status", ["attributed", "converted", "voided"]);
export const affiliateEarningStatusEnum = pgEnum("affiliate_earning_status", ["pending", "paid", "cancelled"]);

export const affiliate = pgTable(
  "affiliate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    actorType: affiliateActorTypeEnum("actor_type").notNull(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    organizationId: text("organization_id").references((): AnyPgColumn => organization.id, { onDelete: "set null" }),
    code: text("code").notNull().unique(),
    commissionType: affiliateCommissionTypeEnum("commission_type").notNull().default("percent"),
    commissionValue: integer("commission_value").notNull().default(0),
    status: affiliateStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("affiliate_user_idx").on(table.userId),
    index("affiliate_org_idx").on(table.organizationId),
  ],
);

export const affiliateReferral = pgTable(
  "affiliate_referral",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    affiliateId: text("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    source: affiliateReferralSourceEnum("source").notNull().default("coupon"),
    // Empresa convidada; fica preenchido quando a empresa é criada no onboarding.
    referredOrganizationId: text("referred_organization_id").references((): AnyPgColumn => organization.id, { onDelete: "set null" }),
    status: affiliateReferralStatusEnum("status").notNull().default("attributed"),
    convertedInvoiceId: text("converted_invoice_id").references((): AnyPgColumn => invoice.id, { onDelete: "set null" }),
    commissionAmountMzn: integer("commission_amount_mzn"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    convertedAt: timestamp("converted_at"),
  },
  (table) => [
    index("affiliate_referral_affiliate_idx").on(table.affiliateId),
    // Uma organização só pode ser atribuída a um único afiliado.
    uniqueIndex("affiliate_referral_org_uidx").on(table.referredOrganizationId),
    index("affiliate_referral_status_idx").on(table.status),
  ],
);

export const affiliateEarning = pgTable(
  "affiliate_earning",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    affiliateId: text("affiliate_id")
      .notNull()
      .references(() => affiliate.id, { onDelete: "cascade" }),
    referralId: text("referral_id")
      .notNull()
      .references(() => affiliateReferral.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").references((): AnyPgColumn => invoice.id, { onDelete: "set null" }),
    amountMzn: integer("amount_mzn").notNull(),
    status: affiliateEarningStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    paidAt: timestamp("paid_at"),
  },
  (table) => [
    index("affiliate_earning_affiliate_idx").on(table.affiliateId),
    index("affiliate_earning_referral_idx").on(table.referralId),
    uniqueIndex("affiliate_earning_referral_invoice_uidx").on(table.referralId, table.invoiceId),
  ],
);
