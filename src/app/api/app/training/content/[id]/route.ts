import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  // Get tenant context
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  const { data: content, error } = await supabase
    .from("training_content")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id)
    .single();

  if (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Increment view count
  await supabase
    .from("training_content")
    .update({ view_count: content.view_count + 1 })
    .eq("id", id);

  return NextResponse.json({ content });
}

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

  // Only club leadership can update content
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  // Allow updating these fields
  const allowedFields = [
    "title",
    "description",
    "content_type",
    "audience",
    "min_age_division",
    "max_age_division",
    "gender_filter",
    "skill_level",
    "video_url",
    "document_url",
    "thumbnail_url",
    "duration_minutes",
    "content_body",
    "category_id",
    "tags",
    "is_published",
    "is_featured",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  const { data: content, error } = await supabase
    .from("training_content")
    .update(updateData)
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating content:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }

  return NextResponse.json({ content });
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

  // Only club leadership can delete content
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { error } = await supabase
    .from("training_content")
    .delete()
    .eq("id", id)
    .eq("tenant_id", membership.tenant_id);

  if (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json({ error: "Failed to delete content" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
