import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  return NextResponse.json({ 
    link: {
      ...link,
      tenant,
      event,
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

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
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

  const { data: prospect, error: createErr } = await admin
    .from("recruitment_prospects")
    .insert({
      tenant_id: link.tenant_id,
      source_link_id: link.id,
      event_id: link.event_id,
      team_id: link.team_id,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: body.dateOfBirth ?? null,
      age_division: body.ageDivision ?? link.age_division ?? null,
      gender: body.gender ?? link.gender ?? null,
      parent_name: body.parentName ?? null,
      parent_email: body.parentEmail ?? null,
      parent_phone: body.parentPhone ?? null,
      current_club: body.currentClub ?? null,
      current_team: body.currentTeam ?? null,
      primary_position: body.primaryPosition ?? null,
      secondary_position: body.secondaryPosition ?? null,
      grad_year: body.gradYear ?? null,
      school_year: body.schoolYear ?? null,
      recruiting_source: "public_registration",
      notes: body.notes ?? null,
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
