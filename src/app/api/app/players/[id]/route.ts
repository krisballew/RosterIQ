import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/app/players/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({ player: data });
}

// PATCH /api/app/players/[id]
// Updates any fields on a player. Requires club_admin / club_director / director_of_coaching role.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the player exists and get tenant_id
  const { data: existing } = await supabase
    .from("players")
    .select("id, tenant_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  // Verify admin role in that tenant
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("tenant_id", existing.tenant_id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"])
    .limit(1)
    .single();

  // Also allow platform admins (they have null tenant_id)
  const { data: platformMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .limit(1)
    .single();

  if (!membership && !platformMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const allowedFields = [
    "first_name",
    "last_name",
    "team_assigned",
    "age_division",
    "date_of_birth",
    "primary_parent_email",
    "secondary_parent_email",
    "status",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Trim string fields
  for (const key of Object.keys(updates)) {
    if (typeof updates[key] === "string") {
      updates[key] = (updates[key] as string).trim() || null;
    }
  }

  const { data, error } = await supabase
    .from("players")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ player: data });
}

// DELETE /api/app/players/[id]
// Hard-deletes a player. Use PATCH with status=inactive for soft deactivation.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("players")
    .select("id, tenant_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", existing.tenant_id)
    .in("role", ["club_admin", "club_director", "director_of_coaching"])
    .limit(1)
    .single();

  const { data: platformMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .limit(1)
    .single();

  if (!membership && !platformMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("players").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
