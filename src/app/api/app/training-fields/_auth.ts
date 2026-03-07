import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching", "select_coach", "academy_coach"] as const;

export async function requireTrainingFieldAccess(requireAdmin = false) {
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

  const membershipList = memberships ?? [];
  const anyMembership = membershipList[0];
  if (!anyMembership?.tenant_id) return { error: "Forbidden", status: 403 as const };

  if (requireAdmin) {
    const adminMembership = membershipList.find((m) => ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number]));
    if (!adminMembership) return { error: "Forbidden", status: 403 as const };
    return {
      supabase,
      user,
      tenantId: adminMembership.tenant_id,
      membershipId: adminMembership.id,
      role: adminMembership.role,
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
