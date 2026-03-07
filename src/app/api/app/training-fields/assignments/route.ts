import { NextRequest, NextResponse } from "next/server";
import { requireTrainingFieldAccess } from "../_auth";

export const runtime = "nodejs";

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

export async function POST(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));

  const mapId = String(body.mapId ?? "").trim();
  const fieldSpaceId = String(body.fieldSpaceId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const startAt = String(body.startAt ?? "").trim();
  const endAt = String(body.endAt ?? "").trim();

  if (!mapId || !fieldSpaceId || !title || !startAt || !endAt) {
    return NextResponse.json({ error: "mapId, fieldSpaceId, title, startAt, endAt are required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("training_field_space_assignments")
    .select("id, start_at, end_at, status")
    .eq("tenant_id", tenantId)
    .eq("field_space_id", fieldSpaceId)
    .neq("status", "cancelled");

  const conflict = (existing ?? []).some((e) => overlaps(startAt, endAt, e.start_at, e.end_at));
  if (conflict) {
    return NextResponse.json({ error: "This field space is already assigned for an overlapping time." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("training_field_space_assignments")
    .insert({
      tenant_id: tenantId,
      map_id: mapId,
      field_space_id: fieldSpaceId,
      team_id: body.teamId ?? null,
      coach_membership_id: body.coachMembershipId ?? null,
      title,
      start_at: startAt,
      end_at: endAt,
      notes: body.notes ?? null,
      status: body.status ?? "scheduled",
      published_at: body.publishedAt ?? null,
      published_by: body.publishedBy ?? null,
      created_by: membershipId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId, membershipId } = auth;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("title" in body) updates.title = String(body.title ?? "").trim();
  if ("startAt" in body) updates.start_at = body.startAt;
  if ("endAt" in body) updates.end_at = body.endAt;
  if ("notes" in body) updates.notes = body.notes ?? null;
  if ("status" in body) updates.status = body.status;
  if ("teamId" in body) updates.team_id = body.teamId ?? null;
  if ("coachMembershipId" in body) updates.coach_membership_id = body.coachMembershipId ?? null;

  if (body.publish === true) {
    updates.published_at = new Date().toISOString();
    updates.published_by = membershipId;
  }

  if (updates.start_at && updates.end_at) {
    const fieldSpaceId = String(body.fieldSpaceId ?? "").trim();
    if (fieldSpaceId) {
      const { data: existing } = await supabase
        .from("training_field_space_assignments")
        .select("id, start_at, end_at, status")
        .eq("tenant_id", tenantId)
        .eq("field_space_id", fieldSpaceId)
        .neq("status", "cancelled")
        .neq("id", id);
      const conflict = (existing ?? []).some((e) => overlaps(String(updates.start_at), String(updates.end_at), e.start_at, e.end_at));
      if (conflict) {
        return NextResponse.json({ error: "Updated time conflicts with another assignment on this field space." }, { status: 409 });
      }
    }
  }

  const { data, error } = await supabase
    .from("training_field_space_assignments")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase.from("training_field_space_assignments").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
