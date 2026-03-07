import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

  // Fetch categories for tenant
  const { data: categories, error } = await supabase
    .from("training_categories")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .order("sort_order");

  if (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }

  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
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

  // Only club leadership can create categories
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, parent_category_id, sort_order } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: category, error } = await supabase
    .from("training_categories")
    .insert({
      tenant_id: membership.tenant_id,
      name,
      description: description || null,
      parent_category_id: parent_category_id || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }

  return NextResponse.json({ category }, { status: 201 });
}
