import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const COACH_ROLES = ["select_coach", "academy_coach"] as const;

type Membership = {
  id: string;
  tenant_id: string | null;
  role: string;
  is_active?: boolean;
};

async function getAccessContext(tenantIdParam?: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", status: 401, supabase };
  }

  const { data: membershipsData, error: membershipsError } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, is_active")
    .eq("user_id", user.id);

  if (membershipsError) {
    return { error: membershipsError.message, status: 500, supabase };
  }

  const memberships = (membershipsData ?? []) as Membership[];
  const tenantMemberships = memberships.filter((m) => !!m.tenant_id) as Array<Membership & { tenant_id: string }>;

  const isPlatformAdmin = memberships.some((m) => m.role === "platform_admin");

  const tenantId = tenantIdParam?.trim() || tenantMemberships[0]?.tenant_id;
  if (!tenantId) {
    return { error: "No tenant membership found", status: 403, supabase };
  }

  if (!isPlatformAdmin && !tenantMemberships.some((m) => m.tenant_id === tenantId)) {
    return { error: "Forbidden", status: 403, supabase };
  }

  const tenantRoles = memberships.filter((m) => m.tenant_id === tenantId);
  const isTenantAdmin =
    isPlatformAdmin ||
    tenantRoles.some((m) => ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number]));

  const coachMembershipIds = tenantRoles
    .filter(
      (m) =>
        COACH_ROLES.includes(m.role as (typeof COACH_ROLES)[number]) &&
        (m.is_active ?? true)
    )
    .map((m) => m.id);

  return {
    error: null,
    status: 200,
    supabase,
    user,
    tenantId,
    isPlatformAdmin,
    isTenantAdmin,
    coachMembershipIds,
    memberships,
  };
}

// GET /api/app/reviews?periodId=...&tenantId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantIdParam = searchParams.get("tenantId");
  const selectedPeriodIdParam = searchParams.get("periodId");

  const ctx = await getAccessContext(tenantIdParam);
  if (ctx.error || !ctx.tenantId) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { supabase, tenantId, isTenantAdmin, coachMembershipIds } = ctx;

  if (!isTenantAdmin && coachMembershipIds.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: periodsData, error: periodsError } = await supabase
    .from("review_periods")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("season_year", { ascending: false })
    .order("due_date", { ascending: false });

  if (periodsError) {
    return NextResponse.json({ error: periodsError.message }, { status: 500 });
  }

  const periods = periodsData ?? [];
  const selectedPeriod =
    periods.find((p) => p.id === selectedPeriodIdParam) ??
    periods.find((p) => p.is_active) ??
    periods[0] ??
    null;

  let players: Array<{
    id: string;
    first_name: string;
    last_name: string;
    team_assigned: string | null;
    age_division: string | null;
    status: string;
  }> = [];

  if (isTenantAdmin) {
    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, first_name, last_name, team_assigned, age_division, status")
      .eq("tenant_id", tenantId)
      .neq("status", "inactive")
      .order("last_name")
      .order("first_name");

    if (playersError) {
      return NextResponse.json({ error: playersError.message }, { status: 500 });
    }
    players = playersData ?? [];
  } else {
    const { data: teamsData, error: teamsError } = await supabase
      .from("teams")
      .select("name")
      .eq("tenant_id", tenantId)
      .in("coach_membership_id", coachMembershipIds);

    if (teamsError) {
      return NextResponse.json({ error: teamsError.message }, { status: 500 });
    }

    const teamNames = (teamsData ?? []).map((t) => t.name).filter(Boolean);

    if (teamNames.length > 0) {
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, first_name, last_name, team_assigned, age_division, status")
        .eq("tenant_id", tenantId)
        .neq("status", "inactive")
        .in("team_assigned", teamNames)
        .order("last_name")
        .order("first_name");

      if (playersError) {
        return NextResponse.json({ error: playersError.message }, { status: 500 });
      }
      players = playersData ?? [];
    }
  }

  const playerIds = players.map((p) => p.id);

  let reviews: Array<{
    id: string;
    player_id: string;
    status: "draft" | "published" | "completed";
    ratings: Record<string, "red" | "yellow" | "green">;
    key_strengths: string;
    growth_areas: string;
    coach_notes: string;
    shared_at: string | null;
    published_at: string | null;
    accepted_by_user_id: string | null;
    updated_at: string;
    completed_at: string | null;
  }> = [];

  if (selectedPeriod && playerIds.length > 0) {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("player_reviews")
      .select("id, player_id, status, ratings, key_strengths, growth_areas, coach_notes, shared_at, published_at, accepted_by_user_id, updated_at, completed_at")
      .eq("tenant_id", tenantId)
      .eq("review_period_id", selectedPeriod.id)
      .in("player_id", playerIds);

    if (reviewsError) {
      return NextResponse.json({ error: reviewsError.message }, { status: 500 });
    }
    reviews = (reviewsData ?? []) as typeof reviews;
  }

  const reviewMap = new Map(reviews.map((r) => [r.player_id, r]));

  const rows = players.map((p) => ({
    ...p,
    review: reviewMap.get(p.id) ?? null,
  }));

  const completedCount = rows.filter((r) => r.review?.status === "completed").length;
  const incompleteCount = rows.length - completedCount;

  let dueAlert: { type: "overdue" | "due_soon"; message: string } | null = null;
  if (selectedPeriod && incompleteCount > 0) {
    const due = new Date(`${selectedPeriod.due_date}T23:59:59`);
    const now = new Date();
    const ms = due.getTime() - now.getTime();
    const dayDiff = Math.ceil(ms / (1000 * 60 * 60 * 24));

    if (dayDiff < 0) {
      dueAlert = {
        type: "overdue",
        message: `${incompleteCount} review${incompleteCount === 1 ? "" : "s"} are overdue for ${selectedPeriod.title}.`,
      };
    } else if (dayDiff <= 7) {
      dueAlert = {
        type: "due_soon",
        message: `${incompleteCount} review${incompleteCount === 1 ? "" : "s"} are due in ${dayDiff} day${dayDiff === 1 ? "" : "s"} for ${selectedPeriod.title}.`,
      };
    }
  }

  return NextResponse.json({
    tenantId,
    canManagePeriods: isTenantAdmin,
    periods,
    selectedPeriodId: selectedPeriod?.id ?? null,
    summary: {
      total: rows.length,
      completed: completedCount,
      incomplete: incompleteCount,
    },
    dueAlert,
    players: rows,
  });
}

// PUT /api/app/reviews
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const ctx = await getAccessContext(body?.tenantId ?? null);
  if (ctx.error || !ctx.tenantId) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { supabase, tenantId, isTenantAdmin, coachMembershipIds, memberships } = ctx;

  const reviewPeriodId = typeof body.review_period_id === "string" ? body.review_period_id : "";
  const playerId = typeof body.player_id === "string" ? body.player_id : "";
  const status = "draft";

  if (!reviewPeriodId || !playerId) {
    return NextResponse.json({ error: "review_period_id and player_id are required" }, { status: 400 });
  }

  const { data: period, error: periodError } = await supabase
    .from("review_periods")
    .select("id")
    .eq("id", reviewPeriodId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (periodError) {
    return NextResponse.json({ error: periodError.message }, { status: 500 });
  }
  if (!period) {
    return NextResponse.json({ error: "Review period not found" }, { status: 404 });
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, team_assigned")
    .eq("id", playerId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const { data: teamForPlayer } = await supabase
    .from("teams")
    .select("id, coach_membership_id")
    .eq("tenant_id", tenantId)
    .eq("name", player.team_assigned ?? "")
    .maybeSingle();

  const { data: existingReview, error: existingReviewError } = await supabase
    .from("player_reviews")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("review_period_id", reviewPeriodId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (existingReviewError) {
    return NextResponse.json({ error: existingReviewError.message }, { status: 500 });
  }

  if (existingReview?.status === "completed" && !isTenantAdmin) {
    return NextResponse.json(
      { error: "Completed reviews cannot be edited by coaches" },
      { status: 400 }
    );
  }

  if (!isTenantAdmin) {
    const assignedCoachMembershipId = teamForPlayer?.coach_membership_id;
    if (!assignedCoachMembershipId || !coachMembershipIds.includes(assignedCoachMembershipId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const rawRatings = body.ratings && typeof body.ratings === "object" ? body.ratings : {};
  const ratingsEntries = Object.entries(rawRatings as Record<string, unknown>).filter(
    ([, v]) => v === "red" || v === "yellow" || v === "green"
  );
  const ratings = Object.fromEntries(ratingsEntries) as Record<string, "red" | "yellow" | "green">;

  const keyStrengths = typeof body.key_strengths === "string" ? body.key_strengths : "";
  const growthAreas = typeof body.growth_areas === "string" ? body.growth_areas : "";
  const coachNotes = typeof body.coach_notes === "string" ? body.coach_notes : "";

  const reviewerMembershipId =
    teamForPlayer?.coach_membership_id ??
    memberships.find((m) => m.tenant_id === tenantId && (m.is_active ?? true))?.id ??
    null;

  const { data: upserted, error: upsertError } = await supabase
    .from("player_reviews")
    .upsert(
      {
        tenant_id: tenantId,
        player_id: playerId,
        team_id: teamForPlayer?.id ?? null,
        review_period_id: reviewPeriodId,
        reviewer_membership_id: reviewerMembershipId,
        status,
        ratings,
        key_strengths: keyStrengths,
        growth_areas: growthAreas,
        coach_notes: coachNotes,
        shared_at: null,
        published_at: null,
        accepted_by_user_id: null,
        completed_at: null,
      },
      { onConflict: "review_period_id,player_id" }
    )
    .select("id, player_id, status, ratings, key_strengths, growth_areas, coach_notes, shared_at, published_at, accepted_by_user_id, updated_at, completed_at")
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ review: upserted });
}
