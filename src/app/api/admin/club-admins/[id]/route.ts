import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/roles";

export const runtime = "nodejs";

// PATCH — set a user's password as a platform admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);
  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { password } = await req.json().catch(() => ({})) as { password?: string };

  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve the membership → user_id
  const { data: membership, error: fetchError } = await admin
    .from("memberships")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(
    membership.user_id,
    { password }
  );

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: null,
    action: "set_password",
    entity_type: "club_admin",
    entity_id: membership.user_id,
    metadata: { membership_id: id },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);
  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { deleteUser } = await req.json().catch(() => ({ deleteUser: false })) as { deleteUser?: boolean };

  const admin = createAdminClient();

  // Fetch the membership to get user_id before deleting
  const { data: membership, error: fetchError } = await admin
    .from("memberships")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !membership) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  // Delete membership row
  const { error: deleteError } = await admin
    .from("memberships")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Optionally delete the Supabase auth user entirely
  if (deleteUser) {
    const { error: userDeleteError } = await admin.auth.admin.deleteUser(membership.user_id);
    if (userDeleteError) {
      // Membership already deleted — log but don't fail the response
      console.error("Failed to delete auth user:", userDeleteError.message);
    }
  }

  // Audit
  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: null,
    action: deleteUser ? "delete_user" : "deactivate",
    entity_type: "club_admin",
    entity_id: membership.user_id,
    metadata: { membership_id: id, deleted_auth_user: deleteUser ?? false },
  });

  return NextResponse.json({ success: true });
}
