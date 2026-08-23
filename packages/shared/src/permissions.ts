import type { OrgRole, SystemRole } from "./types.js";

export type DomainPermission =
  | "profile:edit"
  | "profile:delete"
  | "members:manage"
  | "tasks:manage"
  | "tasks:view"
  | "events:manage"
  | "reviews:manage"
  | "verifications:review"
  | "reviews:moderate"
  | "badges:manage"
  | "users:manage"
  | "system:manage";

export const ORG_PERMISSIONS: Record<OrgRole, readonly DomainPermission[]> = {
  owner: ["profile:edit", "profile:delete", "members:manage", "tasks:manage", "tasks:view", "events:manage"],
  admin: ["profile:edit", "members:manage", "tasks:manage", "tasks:view", "events:manage"],
  editor: ["profile:edit", "tasks:manage", "tasks:view"],
  member: ["tasks:view"],
};

export const SYSTEM_ROLE_PERMISSIONS: Record<SystemRole, readonly DomainPermission[]> = {
  user: [],
  moderator: ["verifications:review", "reviews:moderate", "badges:manage"],
  admin: ["verifications:review", "reviews:moderate", "badges:manage", "users:manage", "system:manage"],
};

export const SELF_PERMISSIONS: readonly DomainPermission[] = [
  "profile:edit",
  "profile:delete",
  "tasks:manage",
  "reviews:manage",
];

export function hasOrgPermission(role: OrgRole, permission: DomainPermission): boolean {
  return ORG_PERMISSIONS[role].includes(permission);
}

export function hasSystemPermission(role: SystemRole, permission: DomainPermission): boolean {
  const perms = SYSTEM_ROLE_PERMISSIONS[role];
  if ((perms as readonly string[]).includes(permission)) return true;
  // system:manage é wildcard — admin bypassa qualquer permissão
  if ((perms as readonly string[]).includes("system:manage")) return true;
  return false;
}

export function hasSelfPermission(permission: DomainPermission): boolean {
  return SELF_PERMISSIONS.includes(permission);
}

export type ResourceAccess =
  | { type: "organization"; orgRole: OrgRole | null }
  | { type: "user"; isOwner: boolean };

export interface Actor {
  systemRole: SystemRole;
}

export function can(actor: Actor, resource: ResourceAccess, permission: DomainPermission): boolean {
  if (hasSystemPermission(actor.systemRole, permission)) return true;
  if (resource.type === "organization") {
    return resource.orgRole !== null && hasOrgPermission(resource.orgRole, permission);
  }
  return resource.isOwner && hasSelfPermission(permission);
}
