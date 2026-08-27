import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  jsonb,
  smallint,
  doublePrecision,
  integer,
  primaryKey,
  customType,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const systemRoleEnum = pgEnum("system_role", ["user", "moderator", "admin"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "editor", "member"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "in_review", "verified", "suspended"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "rejected", "canceled"]);

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
  },
  (table) => [index("organization_slug_idx").on(table.slug)],
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

export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const profileTypeEnum = pgEnum("profile_type", ["individual", "company"]);
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
    // tsvector gerado para busca full-text (fallback text quando sem postgis/pg_trgm)
    searchTsv: text("search_tsv"),
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
