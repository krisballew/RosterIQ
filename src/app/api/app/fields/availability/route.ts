import { NextRequest, NextResponse } from "next/server";
import { requireFieldAdminContext } from "../_auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId, membershipId } = auth;

  const body = await request.json().catch(() => ({}));
  const fieldId = String(body.fieldId ?? "");
  const dayOfWeek = Number(body.dayOfWeek);
  const openTime = String(body.openTime ?? "");
  const closeTime = String(body.closeTime ?? "");

  if (!fieldId || Number.isNaN(dayOfWeek) || !openTime || !closeTime) {
    return NextResponse.json({ error: "fieldId, dayOfWeek, openTime, closeTime are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("field_availability")
    .insert({
      tenant_id: tenantId,
      field_id: fieldId,
      day_of_week: dayOfWeek,
      open_time: openTime,
      close_time: closeTime,
      created_by: membershipId,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ availability: data });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId } = auth;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabase
    .from("field_availability")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
