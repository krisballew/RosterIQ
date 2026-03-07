import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const COACH_ROLES = ["select_coach", "academy_coach"] as const;
type CoachRole = (typeof COACH_ROLES)[number];

const DEFAULT_STATUSES = [
  "New Lead",
  "Registered",
  "Scheduled",
  "Attended",
  "Evaluated",
  "Follow Up",
  "Waitlist",
  "Not Ready Yet",
  "Offer Extended",
  "Accepted",
  "Declined",
  "Archived",
];

async function requireCoachAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, tenant_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("tenant_id", "is", null);

  const coachMembership = (memberships ?? []).find((m) =>
    COACH_ROLES.includes(m.role as CoachRole)
  );

  if (!coachMembership) return { error: "Forbidden", status: 403 as const };

  return {
    supabase,
    user,
    tenantId: coachMembership.tenant_id as string,
    membershipId: coachMembership.id,
    role: coachMembership.role as string,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireCoachAccess();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, user, tenantId, membershipId, role } = auth;

  // Two-step team lookup — get all active membership IDs for this user/tenant,
  // then find teams where coach_membership_id is one of those IDs.
  const { data: allMemberships } = await supabase
    .from("memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  const membershipIds = (allMemberships ?? []).map((m: { id: string }) => m.id);

  let coachTeamIds: string[] = [];
  if (membershipIds.length > 0) {
    const { data: coachTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("coach_membership_id", membershipIds);
    coachTeamIds = (coachTeams ?? []).map((t: { id: string }) => t.id);
  }

  // Sentinel UUID ensures .in() never accidentally returns all rows when empty
  const teamIdFilter =
    coachTeamIds.length > 0
      ? coachTeamIds
      : ["00000000-0000-0000-0000-000000000000"];

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status")?.trim() ?? "";
  const archived = request.nextUrl.searchParams.get("archived")?.trim() ?? "false";

  // Get all prospect IDs for coach's teams (used to scope evaluations/history)
  const { data: allCoachProspects } = await supabase
    .from("recruitment_prospects")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("team_id", teamIdFilter);

  const allProspectIds = (allCoachProspects ?? []).map((p: { id: string }) => p.id);
  const prospectIdsFilter =
    allProspectIds.length > 0
      ? allProspectIds
      : ["00000000-0000-0000-0000-000000000000"];

  let prospectsQuery = supabase
    .from("recruitment_prospects")
    .select("*")
    .eq("tenant_id", tenantId)
    .in("team_id", teamIdFilter)
    .eq("archived", archived === "true")
    .order("updated_at", { ascending: false });

  if (status) prospectsQuery = prospectsQuery.eq("status", status);
  if (q) {
    prospectsQuery = prospectsQuery.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,parent_email.ilike.%${q}%,notes.ilike.%${q}%,current_club.ilike.%${q}%`
    );
  }

  const [prospectsRes, eventsRes, evalsRes, statusRes, teamsRes] = await Promise.all([
    prospectsQuery,
    supabase
      .from("recruitment_events")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("team_id", teamIdFilter)
      .order("starts_at", { ascending: true }),
    supabase
      .from("recruitment_evaluations")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("prospect_id", prospectIdsFilter)
      .order("created_at", { ascending: false }),
    supabase
      .from("recruitment_status_history")
      .select("*")
      .eq("tenant_id", tenantId)
      .in("prospect_id", prospectIdsFilter)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("teams")
      .select("id, name, age_division")
      .in("id", coachTeamIds.length > 0 ? coachTeamIds : ["00000000-0000-0000-0000-000000000000"])
      .order("name"),
  ]);

  // Unused but kept to satisfy type
  void membershipId;

  return NextResponse.json({
    role,
    prospects: prospectsRes.data ?? [],
    events: eventsRes.data ?? [],
    evaluations: evalsRes.data ?? [],
    statusHistory: statusRes.data ?? [],
    teams: teamsRes.data ?? [],
    statuses: DEFAULT_STATUSES,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireCoachAccess();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity ?? "").trim();

  if (entity === "evaluation") {
    const prospectId = String(body.prospectId ?? "").trim();
    if (!prospectId) return NextResponse.json({ error: "prospectId is required" }, { status: 400 });

    // Verify the prospect belongs to this tenant
    const { data: prospect } = await supabase
      .from("recruitment_prospects")
      .select("id, tenant_id")
      .eq("id", prospectId)
      .eq("tenant_id", tenantId)
      .single();

    if (!prospect) return NextResponse.json({ error: "Prospect not found" }, { status: 404 });

    const rating = body.rating != null ? Number(body.rating) : null;
    const { data, error } = await supabase
      .from("recruitment_evaluations")
      .insert({
        prospect_id: prospectId,
        tenant_id: tenantId,
        event_id: body.eventId || null,
        rating: Number.isFinite(rating) ? rating : null,
        readiness: body.readiness || null,
        strengths: body.strengths || null,
        development_areas: body.developmentAreas || null,
        notes: body.notes || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        evaluator_membership_id: membershipId,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ evaluation: data });
  }

  if (entity === "status_change") {
    const prospectId = String(body.prospectId ?? "").trim();
    const newStatus = String(body.newStatus ?? "").trim();
    if (!prospectId || !newStatus) {
      return NextResponse.json({ error: "prospectId and newStatus are required" }, { status: 400 });
    }

    const { data: existing, error: getErr } = await supabase
      .from("recruitment_prospects")
      .select("id, status, tenant_id")
      .eq("id", prospectId)
      .eq("tenant_id", tenantId)
      .single();

    if (getErr || !existing) {
      return NextResponse.json({ error: getErr?.message ?? "Prospect not found" }, { status: 404 });
    }

    const { error: updateErr } = await supabase
      .from("recruitment_prospects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", prospectId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    await supabase.from("recruitment_status_history").insert({
      prospect_id: prospectId,
      tenant_id: tenantId,
      previous_status: existing.status,
      new_status: newStatus,
      change_reason: body.reason || null,
      changed_by: membershipId,
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
}
