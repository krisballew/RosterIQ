import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
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
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const player_id = searchParams.get("player_id");
  const team_id = searchParams.get("team_id");

  let query = supabase
    .from("training_assignments")
    .select(`
      *,
      training_content:content_id (title, content_type, thumbnail_url, duration_minutes),
      player:player_id (first_name, last_name),
      team:team_id (name)
    `)
    .eq("tenant_id", membership.tenant_id);

  // Filter by player or team if specified
  if (player_id) {
    query = query.eq("player_id", player_id);
  }
  if (team_id) {
    query = query.eq("team_id", team_id);
  }

  // Coaches can only see assignments they created or for their teams
  const coachRoles = ["select_coach", "academy_coach", "director_of_coaching"];
  if (coachRoles.includes(membership.role)) {
    query = query.eq("assigned_by", membership.id);
  }

  query = query.order("assigned_at", { ascending: false });

  const { data: assignments, error } = await query;

  if (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }

  return NextResponse.json({ assignments });
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
    .select("id, tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Only coaches and leadership can create assignments
  const allowedRoles = [
    "select_coach",
    "academy_coach",
    "director_of_coaching",
    "club_admin",
    "club_director",
    "platform_admin",
  ];
  if (!allowedRoles.includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { content_id, player_id, team_id, assignment_note, due_date, is_required } = body;

  if (!content_id) {
    return NextResponse.json({ error: "content_id is required" }, { status: 400 });
  }

  if (!player_id && !team_id) {
    return NextResponse.json(
      { error: "Either player_id or team_id must be specified" },
      { status: 400 }
    );
  }

  if (player_id && team_id) {
    return NextResponse.json(
      { error: "Cannot assign to both player and team simultaneously" },
      { status: 400 }
    );
  }

  const { data: assignment, error } = await supabase
    .from("training_assignments")
    .insert({
      tenant_id: membership.tenant_id,
      content_id,
      assigned_by: membership.id,
      player_id: player_id || null,
      team_id: team_id || null,
      assignment_note: assignment_note || null,
      due_date: due_date || null,
      is_required: is_required ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }

  return NextResponse.json({ assignment }, { status: 201 });
}
