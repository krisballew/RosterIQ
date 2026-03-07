import { NextRequest, NextResponse } from "next/server";
import { requireTrainingFieldAccess } from "../_auth";

export const runtime = "nodejs";

type TimeSlot = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

function isValidTime(value: unknown) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeSlots(input: unknown): TimeSlot[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((slot) => {
      const raw = slot as Partial<TimeSlot>;
      const id = String(raw.id ?? "").trim();
      const name = String(raw.name ?? "").trim();
      const startTime = String(raw.startTime ?? "").trim();
      const endTime = String(raw.endTime ?? "").trim();

      if (!id || !name || !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
        return null;
      }

      return { id, name, startTime, endTime };
    })
    .filter((slot): slot is TimeSlot => slot !== null);
}

export async function POST(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));
  const mapId = String(body.mapId ?? "").trim();
  const name = String(body.name ?? "").trim();

  if (!mapId || !name) {
    return NextResponse.json({ error: "mapId and name are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("training_field_spaces")
    .insert({
      tenant_id: tenantId,
      map_id: mapId,
      name,
      field_type: body.fieldType ?? null,
      age_suitability: body.ageSuitability ?? null,
      format: body.format ?? null,
      availability_status: body.availabilityStatus ?? "available",
      notes: body.notes ?? null,
      x: Number(body.x ?? 100),
      y: Number(body.y ?? 100),
      width: Number(body.width ?? 140),
      height: Number(body.height ?? 90),
      rotation: Number(body.rotation ?? 0),
      fill_color: body.fillColor ?? "rgba(34, 197, 94, 0.15)",
      border_color: body.borderColor ?? "#16a34a",
      border_style: body.borderStyle ?? "solid",
      available_time_slots: normalizeSlots(body.availableSlots),
      created_by: membershipId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ space: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("name" in body) updates.name = String(body.name ?? "").trim();
  if ("fieldType" in body) updates.field_type = body.fieldType ?? null;
  if ("ageSuitability" in body) updates.age_suitability = body.ageSuitability ?? null;
  if ("format" in body) updates.format = body.format ?? null;
  if ("availabilityStatus" in body) updates.availability_status = body.availabilityStatus ?? "available";
  if ("notes" in body) updates.notes = body.notes ?? null;
  if ("x" in body) updates.x = Number(body.x);
  if ("y" in body) updates.y = Number(body.y);
  if ("width" in body) updates.width = Number(body.width);
  if ("height" in body) updates.height = Number(body.height);
  if ("rotation" in body) updates.rotation = Number(body.rotation);
  if ("fillColor" in body) updates.fill_color = body.fillColor;
  if ("borderColor" in body) updates.border_color = body.borderColor;
  if ("borderStyle" in body) updates.border_style = body.borderStyle;
  if ("availableSlots" in body) updates.available_time_slots = normalizeSlots(body.availableSlots);

  const { data, error } = await supabase
    .from("training_field_spaces")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ space: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase.from("training_field_spaces").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
