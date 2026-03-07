import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDivisionForDob, parseDivisionNumber } from "@/lib/age-division";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: link, error } = await admin
    .from("recruitment_registration_links")
    .select("id, name, season, age_division, gender, team_id, event_id, starts_on, ends_on, is_active, tenant_id")
    .eq("slug", slug)
    .single();

  if (error || !link) return NextResponse.json({ error: "Registration link not found" }, { status: 404 });
  if (!link.is_active) return NextResponse.json({ error: "Registration link is inactive" }, { status: 410 });

  const today = new Date().toISOString().slice(0, 10);
  if ((link.starts_on && today < link.starts_on) || (link.ends_on && today > link.ends_on)) {
    return NextResponse.json({ error: "Registration link is outside active dates" }, { status: 410 });
  }

  // Fetch tenant information
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, name, logo_url")
    .eq("id", link.tenant_id)
    .single();

  // Fetch event information if linked
  let event = null;
  if (link.event_id) {
    const { data: eventData } = await admin
      .from("recruitment_events")
      .select("id, name, event_type, starts_at, ends_at, location")
      .eq("id", link.event_id)
      .single();
    event = eventData;
  }

  // Fetch team information if linked
  let team = null;
  if (link.team_id) {
    const { data: teamData } = await admin
      .from("teams")
      .select("id, name, age_division")
      .eq("id", link.team_id)
      .single();
    team = teamData;
  }

  return NextResponse.json({ 
    link: {
      ...link,
      tenant,
      event,
      team,
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const admin = createAdminClient();
  const body = await request.json().catch(() => ({}));

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const dateOfBirth = String(body.dateOfBirth ?? "").trim();
  const allowPlayUpOverride = Boolean(body.allowPlayUpOverride);

  if (!firstName || !lastName || !dateOfBirth) {
    return NextResponse.json({ error: "First name, last name, and date of birth are required" }, { status: 400 });
  }

  const { data: link, error: linkErr } = await admin
    .from("recruitment_registration_links")
    .select("id, tenant_id, team_id, event_id, season, age_division, gender, starts_on, ends_on, is_active")
    .eq("slug", slug)
    .single();

  if (linkErr || !link) return NextResponse.json({ error: "Registration link not found" }, { status: 404 });
  if (!link.is_active) return NextResponse.json({ error: "Registration link is inactive" }, { status: 410 });

  const today = new Date().toISOString().slice(0, 10);
  if ((link.starts_on && today < link.starts_on) || (link.ends_on && today > link.ends_on)) {
    return NextResponse.json({ error: "Registration link is outside active dates" }, { status: 410 });
  }

  let teamAgeDivision = link.age_division;
  let teamName = link.age_division ?? "this team";
  if (link.team_id) {
    const { data: team } = await admin
      .from("teams")
      .select("name, age_division")
      .eq("id", link.team_id)
      .single();

    if (team?.age_division) teamAgeDivision = team.age_division;
    if (team?.name) teamName = team.name;
  }

  const playerDivision = computeDivisionForDob(dateOfBirth);
  const playerDivisionNum = parseDivisionNumber(playerDivision);
  const teamDivisionNum = parseDivisionNumber(teamAgeDivision);

  if (playerDivisionNum !== null && teamDivisionNum !== null) {
    if (playerDivisionNum > teamDivisionNum) {
      return NextResponse.json(
        {
          error:
            `Based on date of birth, this player is ${playerDivision}. ` +
            `${teamName} is ${teamAgeDivision}. Players cannot play down an age group. ` +
            "Please visit the club website for the correct age-division sign-up link.",
        },
        { status: 400 }
      );
    }

    if (playerDivisionNum < teamDivisionNum && !allowPlayUpOverride) {
      return NextResponse.json(
        {
          error:
            `Based on date of birth, this player is ${playerDivision} and this registration is for ${teamAgeDivision}. ` +
            "Playing up is allowed only with override confirmation.",
        },
        { status: 400 }
      );
    }
  }

  const gender = String(body.gender ?? "").trim();
  const parentName = String(body.parentName ?? "").trim();
  const parentEmail = String(body.parentEmail ?? "").trim();
  const parentPhone = String(body.parentPhone ?? "").trim();
  const currentClub = String(body.currentClub ?? "").trim();
  const currentTeam = String(body.currentTeam ?? "").trim();
  const primaryPosition = String(body.primaryPosition ?? "").trim();
  const secondaryPosition = String(body.secondaryPosition ?? "").trim();

  const { data: prospect, error: createErr } = await admin
    .from("recruitment_prospects")
    .insert({
      tenant_id: link.tenant_id,
      source_link_id: link.id,
      event_id: link.event_id,
      team_id: link.team_id,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      age_division: playerDivision ?? teamAgeDivision ?? null,
      gender: gender || link.gender || null,
      parent_name: parentName || null,
      parent_email: parentEmail || null,
      parent_phone: parentPhone || null,
      current_club: currentClub || null,
      current_team: currentTeam || null,
      primary_position: primaryPosition || null,
      secondary_position: secondaryPosition || null,
      grad_year: null,
      school_year: null,
      recruiting_source: "public_registration",
      notes: null,
      status: "Registered",
      created_by: null,
    })
    .select("id, status")
    .single();

  if (createErr || !prospect) return NextResponse.json({ error: createErr?.message ?? "Failed to create prospect" }, { status: 500 });

  const { error: historyErr } = await admin.from("recruitment_status_history").insert({
    tenant_id: link.tenant_id,
    prospect_id: prospect.id,
    previous_status: null,
    new_status: prospect.status,
    change_reason: "Registered via public link",
    changed_by: null,
  });

  if (historyErr) return NextResponse.json({ error: historyErr.message }, { status: 500 });

  return NextResponse.json({ success: true, prospectId: prospect.id });
}
