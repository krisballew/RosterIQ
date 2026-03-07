import { createClient } from "@/lib/supabase/server";

// All roles that may access the recruitment module at all
const RECRUITMENT_ROLES = [
  "platform_admin",
  "club_admin",
  "club_director",
  "director_of_coaching",
  "select_coach",
  "academy_coach",
] as const;

// Only management roles may access the full Recruitment CRM
const MANAGEMENT_ROLES = [
  "platform_admin",
  "club_admin",
  "club_director",
  "director_of_coaching",
] as const;

export async function requireRecruitmentAccess(requireManage = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("tenant_id", "is", null);

  const list = memberships ?? [];

  if (requireManage) {
    // Must hold at least one management-level role — coaches are not allowed here
    const manageMembership = list.find((m) =>
      MANAGEMENT_ROLES.includes(m.role as (typeof MANAGEMENT_ROLES)[number])
    );
    if (!manageMembership) return { error: "Forbidden", status: 403 as const };

    return {
      supabase,
      user,
      tenantId: manageMembership.tenant_id,
      membershipId: manageMembership.id,
      role: manageMembership.role,
    };
  }

  // Any recruitment role is acceptable; prefer management > coach
  const preferredMembership =
    list.find((m) =>
      MANAGEMENT_ROLES.includes(m.role as (typeof MANAGEMENT_ROLES)[number])
    ) ??
    list.find((m) =>
      RECRUITMENT_ROLES.includes(m.role as (typeof RECRUITMENT_ROLES)[number])
    ) ??
    list[0];

  if (!preferredMembership?.tenant_id) return { error: "Forbidden", status: 403 as const };

  return {
    supabase,
    user,
    tenantId: preferredMembership.tenant_id,
    membershipId: preferredMembership.id,
    role: preferredMembership.role,
  };
}
