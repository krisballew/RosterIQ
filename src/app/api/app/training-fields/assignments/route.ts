import { NextRequest, NextResponse } from "next/server";
import { requireTrainingFieldAccess } from "../_auth";

export const runtime = "nodejs";

type TimeSlot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

function overlapsTime(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

function overlapsDateRange(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && aEnd >= bStart;
}

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
  const slotId = String(body.slotId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const effectiveStartDate = String(body.effectiveStartDate ?? "").trim();
  const effectiveEndDate = String(body.effectiveEndDate ?? "").trim();

  if (!mapId || !fieldSpaceId || !slotId || !title || !effectiveStartDate || !effectiveEndDate) {
    return NextResponse.json({ error: "mapId, fieldSpaceId, slotId, title, effectiveStartDate, effectiveEndDate are required" }, { status: 400 });
  }

  if (effectiveStartDate > effectiveEndDate) {
    return NextResponse.json({ error: "effectiveStartDate must be on or before effectiveEndDate" }, { status: 400 });
  }

  const { data: fieldSpace, error: fieldSpaceError } = await supabase
    .from("training_field_spaces")
    .select("id, available_time_slots")
    .eq("tenant_id", tenantId)
    .eq("id", fieldSpaceId)
    .single();

  if (fieldSpaceError || !fieldSpace) {
    return NextResponse.json({ error: fieldSpaceError?.message ?? "Field space not found" }, { status: 404 });
  }

  const slots = Array.isArray(fieldSpace.available_time_slots)
    ? (fieldSpace.available_time_slots as TimeSlot[])
    : [];

  const selectedSlot = slots.find((slot) => slot.id === slotId);
  if (!selectedSlot) {
    return NextResponse.json({ error: "Selected time slot is not available for this field space." }, { status: 400 });
  }

  const startAt = new Date(`${effectiveStartDate}T${selectedSlot.startTime}:00`).toISOString();
  const endAt = new Date(`${effectiveStartDate}T${selectedSlot.endTime}:00`).toISOString();

  const { data: existing } = await supabase
    .from("training_field_space_assignments")
    .select("id, start_at, end_at, status, slot_start_time, slot_end_time, effective_start_date, effective_end_date")
    .eq("tenant_id", tenantId)
    .eq("field_space_id", fieldSpaceId)
    .neq("status", "cancelled");

  const conflict = (existing ?? []).some((e) => {
    const existingStartDate = e.effective_start_date ?? String(e.start_at).slice(0, 10);
    const existingEndDate = e.effective_end_date ?? String(e.end_at).slice(0, 10);
    const existingStartTime = e.slot_start_time ?? String(e.start_at).slice(11, 16);
    const existingEndTime = e.slot_end_time ?? String(e.end_at).slice(11, 16);

    return (
      overlapsDateRange(effectiveStartDate, effectiveEndDate, existingStartDate, existingEndDate) &&
      overlapsTime(selectedSlot.startTime, selectedSlot.endTime, existingStartTime, existingEndTime)
    );
  });
  if (conflict) {
    return NextResponse.json({ error: "This field space already has an overlapping effective-dated assignment for the selected slot window." }, { status: 409 });
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
      slot_id: selectedSlot.id,
      slot_name: selectedSlot.name,
      slot_start_time: selectedSlot.startTime,
      slot_end_time: selectedSlot.endTime,
      effective_start_date: effectiveStartDate,
      effective_end_date: effectiveEndDate,
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
  if ("effectiveStartDate" in body) updates.effective_start_date = body.effectiveStartDate;
  if ("effectiveEndDate" in body) updates.effective_end_date = body.effectiveEndDate;
  if ("slotId" in body) updates.slot_id = body.slotId;
  if ("slotName" in body) updates.slot_name = body.slotName;
  if ("slotStartTime" in body) updates.slot_start_time = body.slotStartTime;
  if ("slotEndTime" in body) updates.slot_end_time = body.slotEndTime;
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
