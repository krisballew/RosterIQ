import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/app/lineup?team_id=<id>
// Returns all saved lineups for a team, ordered newest-first.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  if (!teamId) {
    return NextResponse.json({ error: "team_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lineups")
    .select("id, name, formation, slots, notes, updated_at")
    .eq("tenant_id", membership.tenant_id)
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lineups: data ?? [] });
}

// POST /api/app/lineup
// Upserts a lineup for a team. Requires admin/director role.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const { team_id, formation, slots, name, notes } = body;

  if (!team_id || !formation) {
    return NextResponse.json({ error: "team_id and formation are required" }, { status: 400 });
  }

  // Verify the team belongs to this tenant
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("id", team_id)
    .eq("tenant_id", membership.tenant_id)
    .maybeSingle();

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  // Virtual teams (id starts with "virtual:") don't exist in DB yet — skip team verification
  const isVirtual = String(team_id).startsWith("virtual:");
  if (!isVirtual && !team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  if (isVirtual) {
    // For virtual teams, we can't save a lineup until the team is created in DB
    return NextResponse.json(
      { error: "Create the team in the Teams table before saving a lineup." },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("lineups")
    .insert({
      tenant_id: membership.tenant_id,
      team_id,
      formation,
      slots: slots ?? {},
      name: (name as string | undefined)?.trim() || "Untitled Lineup",
      notes: (notes as string | undefined) ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lineup: data });
}
