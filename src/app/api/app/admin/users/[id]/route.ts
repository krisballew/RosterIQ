import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const ASSIGNABLE_ROLES = [
  "club_admin", "club_director", "director_of_coaching",
  "select_coach", "academy_coach", "select_player", "academy_player",
] as const;

// PATCH — update a membership's role or is_active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: membershipId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerMemberships } = await supabase
    .from("memberships").select("tenant_id, role, user_id").eq("user_id", user.id);

  const isAdmin = (callerMemberships ?? []).some(m => m.role === "platform_admin");
  const tenantMembership = (callerMemberships ?? []).find(m =>
    ADMIN_ROLES.includes(m.role as typeof ADMIN_ROLES[number]) && m.tenant_id
  );

  if (!isAdmin && !tenantMembership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = tenantMembership?.tenant_id;

  const adminClient = createAdminClient();

  // Fetch the target membership
  const { data: target, error: fetchError } = await adminClient
    .from("memberships").select("id, user_id, role, tenant_id, is_active").eq("id", membershipId).single();

  if (fetchError || !target) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Club admins can only edit memberships within their own tenant
  if (!isAdmin && target.tenant_id !== tenantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cannot modify platform_admin memberships unless you are platform_admin
  if (target.role === "platform_admin" && !isAdmin) {
    return NextResponse.json({ error: "Cannot modify platform admin memberships" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { role, is_active } = body as { role?: string; is_active?: boolean };

  const updates: Record<string, unknown> = {};

  if (role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = role;
  }

  if (is_active !== undefined) {
    // Prevent deactivating yourself
    if (target.user_id === user.id && is_active === false) {
      return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
    }
    updates.is_active = is_active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { error: updateError } = await adminClient
    .from("memberships").update(updates).eq("id", membershipId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await adminClient.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: target.tenant_id,
    action: is_active === false ? "deactivate_user" : is_active === true ? "reactivate_user" : "update_user_role",
    entity_type: "membership",
    entity_id: membershipId,
    metadata: updates,
  });

  return NextResponse.json({ success: true });
}
