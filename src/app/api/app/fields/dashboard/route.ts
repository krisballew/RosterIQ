import { NextRequest, NextResponse } from "next/server";
import { requireTenantMembership } from "../_auth";

export const runtime = "nodejs";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: NextRequest) {
  const auth = await requireTenantMembership();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, role, membershipId } = auth;
  const isAdmin = ["platform_admin", "club_admin", "club_director", "director_of_coaching"].includes(role);

  let assignmentQuery = supabase
    .from("field_assignments")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (!isAdmin) {
    const { data: coachedTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("coach_membership_id", membershipId);

    const teamIds = (coachedTeams ?? []).map((t) => t.id);
    if (teamIds.length === 0) {
      assignmentQuery = assignmentQuery.eq("status", "published").in("team_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      assignmentQuery = assignmentQuery.eq("status", "published").in("team_id", teamIds);
    }
  }

  const [mapsRes, fieldsRes, availRes, assignRes, teamsRes] = await Promise.all([
    supabase
      .from("field_maps")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("fields")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("label", { ascending: true }),
    supabase
      .from("field_availability")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true })
      .order("open_time", { ascending: true }),
    assignmentQuery,
    supabase
      .from("teams")
      .select("id, name, age_division, coach_membership_id")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true }),
  ]);

  const at = request.nextUrl.searchParams.get("at");
  let openFields: Array<{ field_id: string; label: string; open_time: string; close_time: string }> = [];

  if (at && fieldsRes.data && availRes.data) {
    const dt = new Date(at);
    if (!Number.isNaN(dt.getTime())) {
      const dayOfWeek = dt.getDay();
      const mins = dt.getHours() * 60 + dt.getMinutes();
      const fieldMap = new Map((fieldsRes.data ?? []).map((f) => [f.id, f]));

      const activeAvail = (availRes.data ?? []).filter(
        (a) => a.day_of_week === dayOfWeek && timeToMinutes(a.open_time) <= mins && timeToMinutes(a.close_time) > mins
      );

      const activeAssignments = (assignRes.data ?? []).filter(
        (a) => a.day_of_week === dayOfWeek && timeToMinutes(a.start_time) <= mins && timeToMinutes(a.end_time) > mins
      );

      const assignedFieldIds = new Set(activeAssignments.map((a) => a.field_id));

      openFields = activeAvail
        .filter((a) => !assignedFieldIds.has(a.field_id))
        .map((a) => ({
          field_id: a.field_id,
          label: fieldMap.get(a.field_id)?.label ?? "Unknown Field",
          open_time: a.open_time,
          close_time: a.close_time,
        }));
    }
  }

  return NextResponse.json({
    fieldMaps: mapsRes.data ?? [],
    fields: fieldsRes.data ?? [],
    availability: availRes.data ?? [],
    assignments: assignRes.data ?? [],
    teams: teamsRes.data ?? [],
    openFields,
  });
}
