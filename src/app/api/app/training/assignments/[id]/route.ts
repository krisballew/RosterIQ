import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant context and check permissions
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Check if user has permission to delete
  const adminRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  const isAdmin = adminRoles.includes(membership.role);

  let deleteQuery = supabase
    .from("training_assignments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id);

  // Coaches can only delete their own assignments
  if (!isAdmin) {
    deleteQuery = deleteQuery.eq("assigned_by", membership.id);
  }

  const { error } = await deleteQuery;

  if (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
