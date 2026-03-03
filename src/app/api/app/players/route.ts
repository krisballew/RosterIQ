import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/app/players?status=active
// Returns players for the caller's tenant. Optionally filter by ?status=active|inactive|practice_only
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Determine caller's tenant
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");

  let query = supabase
    .from("players")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ players: data ?? [] });
}

// POST /api/app/players
// Creates a new player for the caller's tenant. Requires club_admin, club_director, or director_of_coaching role.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin/director role
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"])
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    first_name,
    last_name,
    team_assigned,
    age_division,
    date_of_birth,
    primary_parent_email,
    secondary_parent_email,
    status,
  } = body;

  if (!first_name?.trim() || !last_name?.trim()) {
    return NextResponse.json({ error: "first_name and last_name are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("players")
    .insert({
      tenant_id: membership.tenant_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      team_assigned: team_assigned?.trim() || null,
      age_division: age_division?.trim() || null,
      date_of_birth: date_of_birth || null,
      primary_parent_email: primary_parent_email?.trim() || null,
      secondary_parent_email: secondary_parent_email?.trim() || null,
      status: status ?? "active",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ player: data }, { status: 201 });
}
