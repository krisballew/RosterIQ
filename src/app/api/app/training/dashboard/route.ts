import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Get training dashboard data for the current user
 * Returns:
 * - Assigned content (not completed)
 * - Recommended content (based on their profile)
 * - Their progress
 * - Recently viewed content
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get tenant context and player info
  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select(`
      id,
      tenant_id,
      role
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  // Get player info if user is a player
  let playerInfo = null;
  let teamIds: string[] = [];
  
  if (membership.role === "select_player" || membership.role === "academy_player") {
    const { data: player } = await supabase
      .from("players")
      .select(`
        id,
        age_division,
        team_players:team_players(team_id)
      `)
      .eq("membership_id", membership.id)
      .maybeSingle();

    if (player) {
      playerInfo = player;
      teamIds = player.team_players?.map((tp: { team_id: string }) => tp.team_id) || [];
    }
  }

  // Get assignments for this user (individual or via teams)
  let assignmentsQuery = supabase
    .from("training_assignments")
    .select(`
      *,
      training_content:content_id (
        id,
        title,
        description,
        content_type,
        thumbnail_url,
        duration_minutes,
        category_id
      )
    `)
    .eq("tenant_id", membership.tenant_id);

  if (playerInfo) {
    assignmentsQuery = assignmentsQuery.or(
      `player_id.eq.${playerInfo.id}${teamIds.length > 0 ? `,team_id.in.(${teamIds.join(",")})` : ""}`
    );
  }

  const { data: assignments } = await assignmentsQuery.order("assigned_at", { ascending: false });

  // Get user's progress
  const { data: progress } = await supabase
    .from("training_progress")
    .select(`
      *,
      training_content:content_id (
        id,
        title,
        content_type,
        thumbnail_url,
        duration_minutes
      )
    `)
    .eq("membership_id", membership.id)
    .order("last_viewed_at", { ascending: false, nullsFirst: false })
    .limit(10);

  // Get recommended content based on player's age division and published status
  let recommendedQuery = supabase
    .from("training_content")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .eq("is_published", true);

  // Filter by audience
  if (membership.role === "select_player" || membership.role === "academy_player") {
    recommendedQuery = recommendedQuery.or("audience.eq.player,audience.eq.both");
  } else {
    recommendedQuery = recommendedQuery.or("audience.eq.coach,audience.eq.both");
  }

  // Filter by age division if player
  if (playerInfo?.age_division) {
    recommendedQuery = recommendedQuery.or(
      `min_age_division.is.null,min_age_division.lte.${playerInfo.age_division}`
    );
  }

  const { data: recommended } = await recommendedQuery
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  // Calculate stats
  const completedAssignments = assignments?.filter((a) => {
    const contentProgress = progress?.find((p) => p.content_id === a.content_id);
    return contentProgress?.is_completed;
  }).length || 0;

  const totalAssignments = assignments?.length || 0;
  const overdueAssignments = assignments?.filter((a) => {
    if (!a.due_date) return false;
    const contentProgress = progress?.find((p) => p.content_id === a.content_id);
    if (contentProgress?.is_completed) return false;
    return new Date(a.due_date) < new Date();
  }).length || 0;

  return NextResponse.json({
    assignments: assignments || [],
    progress: progress || [],
    recommended: recommended || [],
    stats: {
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
    },
  });
}
