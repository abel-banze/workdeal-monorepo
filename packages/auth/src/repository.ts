import { and, eq } from "drizzle-orm";
import { db, member, organization } from "@workdeal/db";
import type { OrgRole } from "@workdeal/shared";

export async function getOrgRole(userId: string, organizationId: string): Promise<OrgRole | null> {
  const [row] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return row?.role ?? null;
}

export async function isOrgOwner(userId: string, organizationId: string): Promise<boolean> {
  return (await getOrgRole(userId, organizationId)) === "owner";
}

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  verificationStatus: string | null;
}

export async function listUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const rows = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      role: member.role,
      verificationStatus: organization.verificationStatus,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId));
  return rows as UserOrganization[];
}

export interface OrganizationOnboardingData {
  id: string;
  name: string;
  slug: string;
  verificationStatus: string | null;
  metadata: Record<string, unknown> | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export async function getOrganizationOnboardingData(organizationId: string): Promise<OrganizationOnboardingData | null> {
  const [row] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      verificationStatus: organization.verificationStatus,
      metadata: organization.metadata,
      contactName: organization.contactName,
      contactPhone: organization.contactPhone,
      contactEmail: organization.contactEmail,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!row) return null;
  const meta = (() => {
    try {
      return row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  })();
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    verificationStatus: row.verificationStatus,
    metadata: meta,
    contactName: row.contactName,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
  };
}
