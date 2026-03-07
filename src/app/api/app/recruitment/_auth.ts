import { createClient } from "@/lib/supabase/server";

const RECRUITMENT_ROLES = [
  "platform_admin",
  "club_admin",
  "club_director",
  "director_of_coaching",
  "select_coach",
  "academy_coach",
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
  // Prefer a recruitment-role membership so role detection is stable
  const recruitmentMembership = list.find((m) =>
    RECRUITMENT_ROLES.includes(m.role as (typeof RECRUITMENT_ROLES)[number])
  );
  const anyMembership = recruitmentMembership ?? list[0];
  if (!anyMembership?.tenant_id) return { error: "Forbidden", status: 403 as const };

  if (requireManage) {
    const manageMembership = list.find((m) => RECRUITMENT_ROLES.includes(m.role as (typeof RECRUITMENT_ROLES)[number]));
    if (!manageMembership) return { error: "Forbidden", status: 403 as const };

    return {
      supabase,
      user,
      tenantId: manageMembership.tenant_id,
      membershipId: manageMembership.id,
      role: manageMembership.role,
    };
  }

  return {
    supabase,
    user,
    tenantId: anyMembership.tenant_id,
    membershipId: anyMembership.id,
    role: anyMembership.role,
  };
}
