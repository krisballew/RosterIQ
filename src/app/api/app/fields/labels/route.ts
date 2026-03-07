import { NextRequest, NextResponse } from "next/server";
import { requireFieldAdminContext } from "../_auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId, membershipId } = auth;

  const body = await request.json().catch(() => ({}));
  const label = String(body.label ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const fieldMapId = body.fieldMapId ? String(body.fieldMapId) : null;

  if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("fields")
    .insert({
      tenant_id: tenantId,
      label,
      description,
      field_map_id: fieldMapId,
      created_by: membershipId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: data });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabase, tenantId } = auth;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if ("label" in body) updates.label = String(body.label ?? "").trim();
  if ("description" in body) updates.description = String(body.description ?? "").trim() || null;
  if ("fieldMapId" in body) updates.field_map_id = body.fieldMapId ? String(body.fieldMapId) : null;
  if ("isActive" in body) updates.is_active = Boolean(body.isActive);

  const { data, error } = await supabase
    .from("fields")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ field: data });
}
