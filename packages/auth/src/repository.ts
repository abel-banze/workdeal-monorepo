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
