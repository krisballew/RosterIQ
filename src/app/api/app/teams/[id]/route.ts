import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ── shared auth helper ────────────────────────────────────────────────────────
async function authorizeTeam(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, supabase, user: null, team: null };

  const { data: team } = await supabase
    .from("teams")
    .select("id, tenant_id")
    .eq("id", id)
    .single();

  if (!team) return { error: "Team not found", status: 404, supabase, user, team: null };

  // Must be an admin in the team's tenant
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", team.tenant_id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"])
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
    return { error: "Forbidden", status: 403, supabase, user, team: null };
  }

  return { error: null, status: 200, supabase, user, team };
}

// PATCH /api/app/teams/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, team } = await authorizeTeam(id);
  if (error || !team) return NextResponse.json({ error }, { status });

  const body = await request.json();
  const allowed = ["name", "age_division", "birth_year", "roster_limit"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (!updates.name && Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("teams")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ team: data });
}

// DELETE /api/app/teams/[id]
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { error, status, supabase, team } = await authorizeTeam(id);
  if (error || !team) return NextResponse.json({ error }, { status });

  const { error: deleteError } = await supabase.from("teams").delete().eq("id", id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
