import { NextRequest, NextResponse } from "next/server";
import { requireFieldAdminContext } from "../_auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const imageUrl = String(body.imageUrl ?? "").trim();

  if (!name || !imageUrl) {
    return NextResponse.json({ error: "name and imageUrl are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("field_maps")
    .insert({
      tenant_id: tenantId,
      name,
      image_url: imageUrl,
      created_by: membershipId,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fieldMap: data });
}
