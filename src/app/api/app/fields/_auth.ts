import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;

export async function requireFieldAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const list = memberships ?? [];
  const adminMembership = list.find(
    (m) => m.tenant_id && ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number])
  );

  if (!adminMembership?.tenant_id) {
    return { error: "Forbidden", status: 403 as const };
  }

  return {
    supabase,
    user,
    tenantId: adminMembership.tenant_id,
    membershipId: adminMembership.id,
  };
}

export async function requireTenantMembership() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("tenant_id", "is", null);

  const membership = (memberships ?? [])[0];

  if (!membership?.tenant_id) {
    return { error: "Forbidden", status: 403 as const };
  }

  return {
    supabase,
    user,
    tenantId: membership.tenant_id,
    membershipId: membership.id,
    role: membership.role,
  };
}
