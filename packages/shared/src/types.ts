export const SYSTEM_ROLES = ["user", "moderator", "admin"] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

export const ORG_ROLES = ["owner", "admin", "editor", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const VERIFICATION_STATUSES = ["pending", "in_review", "verified", "suspended"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const INVITATION_STATUSES = ["pending", "accepted", "rejected", "canceled"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export type ProfileType = "individual" | "company";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  systemRole: SystemRole;
  emailVerified: boolean;
  phone: string | null;
  locale: string;
}

export interface SessionInfo {
  sessionId: string | null;
  user: AuthUser;
}
