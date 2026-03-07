import { NextRequest, NextResponse } from "next/server";
import { requireFieldAdminContext } from "../_auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId, membershipId } = auth;

  const body = await request.json().catch(() => ({}));
  const teamId = String(body.teamId ?? "");
  const fieldId = String(body.fieldId ?? "");
  const dayOfWeek = Number(body.dayOfWeek);
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const notes = String(body.notes ?? "").trim() || null;

  if (!teamId || !fieldId || Number.isNaN(dayOfWeek) || !startTime || !endTime) {
    return NextResponse.json({ error: "teamId, fieldId, dayOfWeek, startTime, endTime are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("field_assignments")
    .insert({
      tenant_id: tenantId,
      team_id: teamId,
      field_id: fieldId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      notes,
      status: "draft",
      created_by: membershipId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assignment: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId } = auth;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("field_assignments")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
