import { Role, Membership } from "@/types/database";

const ROLE_LABELS: Record<Role, string> = {
  platform_admin: "Platform Administrator",
  club_admin: "Club Administrator",
  club_director: "Club Director",
  director_of_coaching: "Director of Coaching",
  select_coach: "Select Coach",
  academy_coach: "Academy Coach",
  select_player: "Select Player",
  academy_player: "Academy Player",
};

const ROLE_PRIORITY: Role[] = [
  "platform_admin",
  "club_admin",
  "club_director",
  "director_of_coaching",
  "select_coach",
  "academy_coach",
  "select_player",
  "academy_player",
];

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

export function getHighestRole(memberships: Membership[]): Role | null {
  if (!memberships.length) return null;
  const roles = memberships.map((m) => m.role);
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r;
  }
  return roles[0];
}

export function isPlatformAdmin(memberships: Membership[]): boolean {
  return memberships.some((m) => m.role === "platform_admin");
}

export function getMembershipsForTenant(
  memberships: Membership[],
  tenantId: string
): Membership[] {
  return memberships.filter(
    (m) => m.tenant_id === tenantId || m.tenant_id === null
  );
}

export { ROLE_LABELS, ROLE_PRIORITY };
