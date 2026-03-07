import { NextRequest, NextResponse } from "next/server";
import { requireRecruitmentAccess } from "./_auth";

export const runtime = "nodejs";

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

/**
 * Convert a naive local datetime string (e.g. "2026-03-07T10:00") to a UTC Date,
 * treating it as wall-clock time in the given IANA timezone.
 */
function zonedToUTC(localDateTimeStr: string, timeZone: string): Date {
  // Parse the naive string as if it were UTC to get a reference instant
  const ref = new Date(localDateTimeStr + ":00.000Z");
  // Get what the same instant looks like in the target timezone
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(ref);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  // Build the apparent UTC timestamp for that timezone's reading
  const apparentUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  // The offset is how far the zone was from UTC at the reference instant
  const offsetMs = ref.getTime() - apparentUTC;
  // Apply offset to the original naive-as-UTC value to get the true UTC instant
  return new Date(ref.getTime() + offsetMs);
}

/**
 * Format a UTC Date as "YYYY-MM-DD" in the given IANA timezone (for same-day checks).
 */
function formatDateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cur.trim());
      cur = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (cur.length > 0 || row.length > 0) {
        row.push(cur.trim());
        rows.push(row);
      }
      row = [];
      cur = "";
      if (ch === "\r" && next === "\n") i += 1;
      continue;
    }

    cur += ch;
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur.trim());
    rows.push(row);
  }

  return rows;
}

export async function GET(request: NextRequest) {
  // Management roles only — coaches use /api/app/my-recruitment
  const auth = await requireRecruitmentAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, role } = auth;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const status = request.nextUrl.searchParams.get("status")?.trim() ?? "";
  const ageDivision = request.nextUrl.searchParams.get("ageDivision")?.trim() ?? "";
  const gender = request.nextUrl.searchParams.get("gender")?.trim() ?? "";
  const teamId = request.nextUrl.searchParams.get("teamId")?.trim() ?? "";
  const position = request.nextUrl.searchParams.get("position")?.trim() ?? "";
  const source = request.nextUrl.searchParams.get("source")?.trim() ?? "";
  const currentClub = request.nextUrl.searchParams.get("currentClub")?.trim() ?? "";
  const archived = request.nextUrl.searchParams.get("archived")?.trim() ?? "false";

  let prospectsQuery = supabase
    .from("recruitment_prospects")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("archived", archived === "true")
    .order("updated_at", { ascending: false });

  if (status) prospectsQuery = prospectsQuery.eq("status", status);
  if (ageDivision) prospectsQuery = prospectsQuery.eq("age_division", ageDivision);
  if (gender) prospectsQuery = prospectsQuery.eq("gender", gender);
  if (source) prospectsQuery = prospectsQuery.eq("recruiting_source", source);
  if (currentClub) prospectsQuery = prospectsQuery.ilike("current_club", `%${currentClub}%`);

  if (position) {
    prospectsQuery = prospectsQuery.or(`primary_position.ilike.%${position}%,secondary_position.ilike.%${position}%`);
  }

  if (q) {
    prospectsQuery = prospectsQuery.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,parent_email.ilike.%${q}%,parent_phone.ilike.%${q}%,notes.ilike.%${q}%,current_club.ilike.%${q}%`
    );
  }

  if (teamId) {
    prospectsQuery = prospectsQuery.eq("team_id", teamId);
  }

  const eventsQuery = supabase
    .from("recruitment_events")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("starts_at", { ascending: false });

  const [prospectsRes, eventsRes, linksRes, evalsRes, statusRes, plansRes, teamsRes, fieldSpacesRes] = await Promise.all([
    prospectsQuery,
    eventsQuery,
    supabase.from("recruitment_registration_links").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("recruitment_evaluations").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    supabase.from("recruitment_status_history").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(300),
    supabase.from("recruitment_plans").select("*").eq("tenant_id", tenantId).order("updated_at", { ascending: false }),
    supabase.from("teams").select("id, name, age_division").eq("tenant_id", tenantId).order("name"),
    supabase.from("training_field_spaces").select("id, map_id, name, field_type, availability_status, training_field_maps(training_complexes(name))").eq("tenant_id", tenantId).eq("availability_status", "available").order("name"),
  ]);

  return NextResponse.json({
    role,
    prospects: prospectsRes.data ?? [],
    events: eventsRes.data ?? [],
    links: linksRes.data ?? [],
    evaluations: evalsRes.data ?? [],
    statusHistory: statusRes.data ?? [],
    plans: plansRes.data ?? [],
    teams: teamsRes.data ?? [],
    fieldSpaces: (fieldSpacesRes.data ?? []).map((s: Record<string, unknown>) => ({
      id: s.id,
      map_id: s.map_id,
      name: s.name,
      field_type: s.field_type ?? null,
      availability_status: s.availability_status,
      complex_name: (s.training_field_maps as { training_complexes?: { name?: string } } | null)?.training_complexes?.name ?? null,
    })),
    statuses: DEFAULT_STATUSES,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireRecruitmentAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity ?? "").trim();

  if (entity === "event") {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Event name is required" }, { status: 400 });

    const eventType = String(body.eventType ?? "tryout").trim();
    const validTypes = ["tryout", "open_session", "interest_form", "camp", "other"];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const genderRaw = String(body.gender ?? "").trim().toLowerCase();
    const gender = genderRaw ? ( ["boys", "girls", "coed"].includes(genderRaw) ? genderRaw : null) : null;
    if (genderRaw && !gender) {
      return NextResponse.json({ error: "Gender must be boys, girls, or coed" }, { status: 400 });
    }

    const startAtRaw = String(body.startAt ?? "").trim();
    const durationMinutes = Number(body.durationMinutes ?? 0);
    if (!startAtRaw) return NextResponse.json({ error: "startAt is required" }, { status: 400 });
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
      return NextResponse.json({ error: "durationMinutes must be between 1 and 1440" }, { status: 400 });
    }

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("timezone")
      .eq("id", tenantId)
      .single();
    const tenantTz = tenantRow?.timezone ?? "UTC";

    const startsAtDate = zonedToUTC(startAtRaw, tenantTz);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid startAt value" }, { status: 400 });
    }

    const endsAtDate = new Date(startsAtDate.getTime() + durationMinutes * 60_000);
    const startDatePart = startAtRaw.slice(0, 10);
    const endDatePartLocal = formatDateInZone(endsAtDate, tenantTz);
    if (startDatePart !== endDatePartLocal) {
      return NextResponse.json({ error: "Events must start and end on the same local day" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("recruitment_events")
      .insert({
        tenant_id: tenantId,
        team_id: body.teamId ?? null,
        name,
        event_type: eventType,
        season: body.season ?? null,
        age_division: body.ageDivision ?? null,
        gender,
        starts_at: startsAtDate.toISOString(),
        ends_at: endsAtDate.toISOString(),
        location: body.location ?? null,
        created_by: membershipId,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-assign the field space to the team on this event date if provided
    if (body.fieldSpaceId && body.fieldSpaceMapId && body.teamId) {
      await supabase.from("training_field_space_assignments").insert({
        tenant_id: tenantId,
        map_id: body.fieldSpaceMapId,
        field_space_id: body.fieldSpaceId,
        team_id: body.teamId,
        title: name,
        start_at: startsAtDate.toISOString(),
        end_at: endsAtDate.toISOString(),
        status: "scheduled",
        created_by: membershipId,
      });
    }

    return NextResponse.json({ event: data });
  }

  if (entity === "registration_link") {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Link name is required" }, { status: 400 });

    const base = slugify(name) || "registration";
    const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;

    const { data, error } = await supabase
      .from("recruitment_registration_links")
      .insert({
        tenant_id: tenantId,
        event_id: body.eventId ?? null,
        slug,
        name,
        season: body.season ?? null,
        age_division: body.ageDivision ?? null,
        gender: body.gender ?? null,
        team_id: body.teamId ?? null,
        starts_on: body.startsOn ?? null,
        ends_on: body.endsOn ?? null,
        is_active: true,
        created_by: membershipId,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data });
  }

  if (entity === "prospect") {
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
    }

    const status = String(body.status ?? "New Lead").trim();

    const { data, error } = await supabase
      .from("recruitment_prospects")
      .insert({
        tenant_id: tenantId,
        event_id: body.eventId ?? null,
        team_id: body.teamId ?? null,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: body.dateOfBirth ?? null,
        age_division: body.ageDivision ?? null,
        gender: body.gender ?? null,
        parent_name: body.parentName ?? null,
        parent_email: body.parentEmail ?? null,
        parent_phone: body.parentPhone ?? null,
        current_club: body.currentClub ?? null,
        current_team: body.currentTeam ?? null,
        primary_position: body.primaryPosition ?? null,
        secondary_position: body.secondaryPosition ?? null,
        grad_year: body.gradYear ?? null,
        school_year: body.schoolYear ?? null,
        recruiting_source: body.recruitingSource ?? "manual",
        roster_fit_tag: body.rosterFitTag ?? null,
        tags: Array.isArray(body.tags) ? body.tags.map((v: unknown) => String(v)) : [],
        notes: body.notes ?? null,
        status,
        created_by: membershipId,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { error: statusError } = await supabase.from("recruitment_status_history").insert({
      tenant_id: tenantId,
      prospect_id: data.id,
      previous_status: null,
      new_status: status,
      change_reason: "Created",
      changed_by: membershipId,
    });

    if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 });
    return NextResponse.json({ prospect: data });
  }

  if (entity === "status_change") {
    const prospectId = String(body.prospectId ?? "").trim();
    const newStatus = String(body.newStatus ?? "").trim();
    if (!prospectId || !newStatus) {
      return NextResponse.json({ error: "prospectId and newStatus are required" }, { status: 400 });
    }

    const { data: existing, error: getErr } = await supabase
      .from("recruitment_prospects")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("id", prospectId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: getErr?.message ?? "Prospect not found" }, { status: 404 });

    const { error: updateErr } = await supabase
      .from("recruitment_prospects")
      .update({ status: newStatus, archived: newStatus === "Archived" })
      .eq("tenant_id", tenantId)
      .eq("id", prospectId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    const { error: histErr } = await supabase.from("recruitment_status_history").insert({
      tenant_id: tenantId,
      prospect_id: prospectId,
      previous_status: existing.status,
      new_status: newStatus,
      change_reason: body.reason ?? null,
      changed_by: membershipId,
    });

    if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (entity === "evaluation") {
    const prospectId = String(body.prospectId ?? "").trim();
    if (!prospectId) return NextResponse.json({ error: "prospectId is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("recruitment_evaluations")
      .insert({
        tenant_id: tenantId,
        prospect_id: prospectId,
        event_id: body.eventId ?? null,
        evaluator_membership_id: membershipId,
        rating: body.rating ?? null,
        readiness: body.readiness ?? null,
        strengths: body.strengths ?? null,
        development_areas: body.developmentAreas ?? null,
        notes: body.notes ?? null,
        tags: Array.isArray(body.tags) ? body.tags.map((v: unknown) => String(v)) : [],
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ evaluation: data });
  }

  if (entity === "plan") {
    const { data, error } = await supabase
      .from("recruitment_plans")
      .upsert({
        id: body.id ?? undefined,
        tenant_id: tenantId,
        team_id: body.teamId ?? null,
        age_division: body.ageDivision ?? null,
        target_roster_size: body.targetRosterSize ?? null,
        open_positions: Array.isArray(body.openPositions) ? body.openPositions.map((v: unknown) => String(v)) : [],
        recruiting_priority: body.recruitingPriority ?? "medium",
        owner_membership_id: body.ownerMembershipId ?? membershipId,
        upcoming_dates: Array.isArray(body.upcomingDates) ? body.upcomingDates.map((v: unknown) => String(v)) : [],
        notes: body.notes ?? null,
        is_active: body.isActive ?? true,
        created_by: membershipId,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: data });
  }

  if (entity === "import_csv") {
    const csv = String(body.csv ?? "");
    const mapping = (body.mapping ?? {}) as Record<string, string>;
    if (!csv.trim()) return NextResponse.json({ error: "csv is required" }, { status: 400 });

    const rows = parseCsv(csv);
    if (rows.length < 2) return NextResponse.json({ error: "No records found in CSV" }, { status: 400 });

    const [headers, ...dataRows] = rows;
    const headersMap = new Map(headers.map((h, i) => [h, i]));

    const inserts = dataRows
      .map((cells) => {
        const get = (field: string) => {
          const header = mapping[field];
          if (!header) return null;
          const idx = headersMap.get(header);
          if (idx === undefined) return null;
          return (cells[idx] ?? "").trim() || null;
        };

        const firstName = get("first_name");
        const lastName = get("last_name");
        if (!firstName || !lastName) return null;

        return {
          tenant_id: tenantId,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: get("date_of_birth"),
          age_division: get("age_division"),
          gender: get("gender"),
          parent_name: get("parent_name"),
          parent_email: get("parent_email"),
          parent_phone: get("parent_phone"),
          current_club: get("current_club"),
          current_team: get("current_team"),
          primary_position: get("primary_position"),
          secondary_position: get("secondary_position"),
          grad_year: get("grad_year") ? Number(get("grad_year")) : null,
          school_year: get("school_year"),
          recruiting_source: get("recruiting_source") ?? "import",
          roster_fit_tag: get("roster_fit_tag"),
          notes: get("notes"),
          status: get("status") ?? "New Lead",
          created_by: membershipId,
        };
      })
      .filter((row) => row !== null);

    if (inserts.length === 0) {
      return NextResponse.json({ error: "No valid records found after mapping" }, { status: 400 });
    }

    const { data, error } = await supabase.from("recruitment_prospects").insert(inserts).select("id, status");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const histories = (data ?? []).map((row) => ({
      tenant_id: tenantId,
      prospect_id: row.id,
      previous_status: null,
      new_status: row.status,
      change_reason: "Imported from CSV",
      changed_by: membershipId,
    }));

    if (histories.length > 0) {
      const { error: histErr } = await supabase.from("recruitment_status_history").insert(histories);
      if (histErr) return NextResponse.json({ error: histErr.message }, { status: 500 });
    }

    return NextResponse.json({ imported: inserts.length });
  }

  if (entity === "convert_to_player") {
    const prospectId = String(body.prospectId ?? "").trim();
    if (!prospectId) return NextResponse.json({ error: "prospectId is required" }, { status: 400 });

    const { data: prospect, error: prospectErr } = await supabase
      .from("recruitment_prospects")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("id", prospectId)
      .single();

    if (prospectErr || !prospect) return NextResponse.json({ error: prospectErr?.message ?? "Prospect not found" }, { status: 404 });

    const positions = [prospect.primary_position, prospect.secondary_position].filter(Boolean);
    const birthYear = prospect.date_of_birth ? Number(String(prospect.date_of_birth).slice(0, 4)) : null;

    const { data: team } = prospect.team_id
      ? await supabase.from("teams").select("name").eq("id", prospect.team_id).single()
      : { data: null };

    const { data: player, error: playerErr } = await supabase
      .from("players")
      .insert({
        tenant_id: tenantId,
        membership_id: null,
        first_name: prospect.first_name,
        last_name: prospect.last_name,
        team_assigned: team?.name ?? prospect.current_team ?? null,
        age_division: prospect.age_division,
        date_of_birth: prospect.date_of_birth,
        primary_parent_email: prospect.parent_email,
        secondary_parent_email: null,
        status: "active",
        positions,
        birth_year: birthYear,
      })
      .select("id")
      .single();

    if (playerErr || !player) return NextResponse.json({ error: playerErr?.message ?? "Failed to create player" }, { status: 500 });

    const { error: updateErr } = await supabase
      .from("recruitment_prospects")
      .update({ status: "Accepted", archived: true, notes: `${prospect.notes ?? ""}\nConverted to player ${player.id}`.trim() })
      .eq("tenant_id", tenantId)
      .eq("id", prospectId);

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    const { error: historyErr } = await supabase.from("recruitment_status_history").insert({
      tenant_id: tenantId,
      prospect_id: prospectId,
      previous_status: prospect.status,
      new_status: "Accepted",
      change_reason: "Converted to active player",
      changed_by: membershipId,
    });

    if (historyErr) return NextResponse.json({ error: historyErr.message }, { status: 500 });
    return NextResponse.json({ playerId: player.id });
  }

  return NextResponse.json({ error: "Unsupported entity" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRecruitmentAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity ?? "").trim();

  if (entity === "event") {
    const eventId = String(body.eventId ?? "").trim();
    if (!eventId) return NextResponse.json({ error: "eventId is required" }, { status: 400 });

    const { data: existingEvent, error: getErr } = await supabase
      .from("recruitment_events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (getErr || !existingEvent) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Event name is required" }, { status: 400 });

    const eventType = String(body.eventType ?? "tryout").trim();
    const validTypes = ["tryout", "open_session", "interest_form", "camp", "other"];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const genderRaw = String(body.gender ?? "").trim().toLowerCase();
    const gender = genderRaw ? (["boys", "girls", "coed"].includes(genderRaw) ? genderRaw : null) : null;

    const startAtRaw = String(body.startAt ?? "").trim();
    const durationMinutes = Number(body.durationMinutes ?? 0);
    if (!startAtRaw) return NextResponse.json({ error: "startAt is required" }, { status: 400 });
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
      return NextResponse.json({ error: "durationMinutes must be between 1 and 1440" }, { status: 400 });
    }

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("timezone")
      .eq("id", tenantId)
      .single();
    const tenantTz = tenantRow?.timezone ?? "UTC";

    const startsAtDate = zonedToUTC(startAtRaw, tenantTz);
    if (Number.isNaN(startsAtDate.getTime())) {
      return NextResponse.json({ error: "Invalid startAt value" }, { status: 400 });
    }
    const endsAtDate = new Date(startsAtDate.getTime() + durationMinutes * 60_000);

    const { data: updatedEvent, error: updateErr } = await supabase
      .from("recruitment_events")
      .update({
        team_id: body.teamId ?? null,
        name,
        event_type: eventType,
        season: body.season ?? null,
        gender,
        starts_at: startsAtDate.toISOString(),
        ends_at: endsAtDate.toISOString(),
        location: body.location ?? null,
      })
      .eq("id", eventId)
      .select("*")
      .single();

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
    return NextResponse.json({ event: updatedEvent });
  }

  if (entity === "registration_link") {
    const linkId = String(body.linkId ?? "").trim();
    if (!linkId) return NextResponse.json({ error: "linkId is required" }, { status: 400 });

    // Verify link belongs to tenant
    const { data: existing, error: getErr } = await supabase
      .from("recruitment_registration_links")
      .select("id")
      .eq("id", linkId)
      .eq("tenant_id", tenantId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("recruitment_registration_links")
      .update({
        starts_on: body.startsOn ?? null,
        ends_on: body.endsOn ?? null,
        is_active: body.isActive ?? true,
      })
      .eq("id", linkId)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data });
  }

  return NextResponse.json({ error: "Unsupported entity" }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRecruitmentAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const eventId = request.nextUrl.searchParams.get("eventId")?.trim() ?? "";
  const linkId = request.nextUrl.searchParams.get("linkId")?.trim() ?? "";

  if (eventId) {
    const { data: existing, error: getErr } = await supabase
      .from("recruitment_events")
      .select("id")
      .eq("id", eventId)
      .eq("tenant_id", tenantId)
      .single();

    if (getErr || !existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    // Delete associated registration links first
    await supabase
      .from("recruitment_registration_links")
      .delete()
      .eq("event_id", eventId)
      .eq("tenant_id", tenantId);

    const { error } = await supabase
      .from("recruitment_events")
      .delete()
      .eq("id", eventId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!linkId) return NextResponse.json({ error: "linkId or eventId is required" }, { status: 400 });

  // Verify link belongs to tenant
  const { data: existing, error: getErr } = await supabase
    .from("recruitment_registration_links")
    .select("id")
    .eq("id", linkId)
    .eq("tenant_id", tenantId)
    .single();

  if (getErr || !existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });

  const { error } = await supabase
    .from("recruitment_registration_links")
    .delete()
    .eq("id", linkId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
