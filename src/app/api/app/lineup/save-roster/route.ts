import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/app/lineup/save-roster
// Persists virtual roster simulation changes by updating player.team_assigned.
// Body: { moves: Array<{ player_id: string; team_name: string | null }> }
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
  const moves: Array<{ player_id: string; team_name: string | null }> = body.moves ?? [];

  if (!Array.isArray(moves) || moves.length === 0) {
    return NextResponse.json({ error: "moves array is required" }, { status: 400 });
  }

  // Verify all players belong to this tenant before updating
  const playerIds = moves.map((m) => m.player_id);
  const { data: ownedPlayers, error: checkError } = await supabase
    .from("players")
    .select("id")
    .eq("tenant_id", membership.tenant_id)
    .in("id", playerIds);

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }

  const ownedIds = new Set((ownedPlayers ?? []).map((p) => p.id));
  const forbidden = moves.filter((m) => !ownedIds.has(m.player_id));
  if (forbidden.length > 0) {
    return NextResponse.json(
      { error: "Some players do not belong to your tenant", forbidden },
      { status: 403 }
    );
  }

  // Apply moves sequentially (could be parallelised, but sequential avoids rate limits)
  const errors: string[] = [];
  for (const move of moves) {
    const { error } = await supabase
      .from("players")
      .update({ team_assigned: move.team_name })
      .eq("id", move.player_id)
      .eq("tenant_id", membership.tenant_id);
    if (error) errors.push(`${move.player_id}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Some updates failed", details: errors }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: moves.length });
}
