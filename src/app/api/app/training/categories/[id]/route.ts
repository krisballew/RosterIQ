import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Only club leadership can update categories
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, parent_category_id, sort_order } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (parent_category_id !== undefined) updateData.parent_category_id = parent_category_id;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  const { data: category, error } = await supabase
    .from("training_categories")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }

  return NextResponse.json({ category });
}

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
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Only club leadership can delete categories
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await supabase
    .from("training_categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id);

  if (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
