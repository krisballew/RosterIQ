import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const COACH_ROLES = ["select_coach", "academy_coach"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/app/reviews/[id]/publish
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: review, error: reviewError } = await supabase
    .from("player_reviews")
    .select("id, tenant_id, player_id, status")
    .eq("id", id)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("id, role, tenant_id, is_active")
    .eq("user_id", user.id)
    .eq("tenant_id", review.tenant_id);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const roleRows = memberships ?? [];
  const isAdmin = roleRows.some((m) => ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number]));
  const coachMembershipIds = roleRows
    .filter((m) => COACH_ROLES.includes(m.role as (typeof COACH_ROLES)[number]) && (m.is_active ?? true))
    .map((m) => m.id);

  let isAssignedCoach = false;
  if (!isAdmin && coachMembershipIds.length > 0) {
    const { data: player } = await supabase
      .from("players")
      .select("team_assigned")
      .eq("id", review.player_id)
      .eq("tenant_id", review.tenant_id)
      .maybeSingle();

    if (player?.team_assigned) {
      const { data: team } = await supabase
        .from("teams")
        .select("coach_membership_id")
        .eq("tenant_id", review.tenant_id)
        .eq("name", player.team_assigned)
        .maybeSingle();

      isAssignedCoach = !!team?.coach_membership_id && coachMembershipIds.includes(team.coach_membership_id);
    }
  }

  if (!isAdmin && !isAssignedCoach) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (review.status === "completed") {
    return NextResponse.json(
      { error: "Completed reviews cannot be republished" },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("player_reviews")
    .update({
      status: "published",
      shared_at: nowIso,
      published_at: nowIso,
    })
    .eq("id", review.id)
    .select("id, status, shared_at, published_at, completed_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ review: updated });
}
