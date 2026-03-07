import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Team } from "@/types/database";

export const runtime = "nodejs";

const COACH_ASSIGNABLE_ROLES = ["select_coach", "academy_coach", "director_of_coaching"] as const;

// GET /api/app/teams
// Returns all teams for the caller's tenant, each with their players embedded.
// If no rows exist in the teams table yet, derives virtual teams from
// distinct players.team_assigned values (so the feature works day-one without seeding).
export async function GET() {
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
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "No tenant membership found" }, { status: 403 });
  }

  const tenantId = membership.tenant_id;

  // Fetch real teams
  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  // Fetch players
  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_name")
    .order("first_name");

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const players = playersData ?? [];
  let teams: Team[] = teamsData ?? [];

  // If no teams configured yet, synthesise virtual teams from player.team_assigned
  if (teams.length === 0) {
    const teamNames = Array.from(
      new Set(players.map((p) => p.team_assigned).filter(Boolean))
    ) as string[];

    teams = teamNames.map((name) => ({
      id: `virtual:${name}`,
      tenant_id: tenantId,
      name,
      age_division: null,
      coach_membership_id: null,
      birth_year: null,
      roster_limit: 16,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  // Attach players to teams; unassigned players go into a "Unassigned" bucket
  const teamNames = new Set(teams.map((t) => t.name));
  const teamMap = teams.map((team) => ({
    ...team,
    players: players.filter((p) => p.team_assigned === team.name),
  }));

  const unassigned = players.filter(
    (p) => !p.team_assigned || !teamNames.has(p.team_assigned)
  );

  return NextResponse.json({ teams: teamMap, unassigned });
}

// POST /api/app/teams
// Creates a new team for the caller's tenant. Requires admin role.
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
  const { name, age_division, birth_year, roster_limit, coach_membership_id } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let coachMembershipId: string | null = null;
  if (typeof coach_membership_id === "string" && coach_membership_id.trim()) {
    const adminClient = createAdminClient();
    const { data: coachMembership, error: coachMembershipError } = await adminClient
      .from("memberships")
      .select("id")
      .eq("id", coach_membership_id)
      .eq("tenant_id", membership.tenant_id)
      .eq("is_active", true)
      .in("role", [...COACH_ASSIGNABLE_ROLES])
      .maybeSingle();

    if (coachMembershipError) {
      return NextResponse.json({ error: coachMembershipError.message }, { status: 500 });
    }

    if (!coachMembership) {
      return NextResponse.json(
        { error: "Invalid coach assignment for this tenant" },
        { status: 400 }
      );
    }
    coachMembershipId = coachMembership.id;
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({
      tenant_id: membership.tenant_id,
      name: name.trim(),
      age_division: age_division ?? null,
      coach_membership_id: coachMembershipId,
      birth_year: birth_year ?? null,
      roster_limit: roster_limit ?? 16,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ team: data }, { status: 201 });
}
