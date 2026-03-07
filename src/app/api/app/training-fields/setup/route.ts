import { NextRequest, NextResponse } from "next/server";
import { requireTrainingFieldAccess } from "../_auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(false);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId } = auth;
  const mapId = request.nextUrl.searchParams.get("mapId");

  const [complexesRes, mapsRes, spacesRes, assignmentsRes, teamsRes] = await Promise.all([
    supabase.from("training_complexes").select("*").eq("tenant_id", tenantId).order("name"),
    supabase.from("training_field_maps").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    mapId
      ? supabase.from("training_field_spaces").select("*").eq("tenant_id", tenantId).eq("map_id", mapId).order("created_at")
      : supabase.from("training_field_spaces").select("*").eq("tenant_id", tenantId).order("created_at"),
    mapId
      ? supabase.from("training_field_space_assignments").select("*").eq("tenant_id", tenantId).eq("map_id", mapId).order("start_at", { ascending: true })
      : supabase.from("training_field_space_assignments").select("*").eq("tenant_id", tenantId).order("start_at", { ascending: true }),
    supabase.from("teams").select("id, name, age_division, coach_membership_id").eq("tenant_id", tenantId).order("name"),
  ]);

  return NextResponse.json({
    complexes: complexesRes.data ?? [],
    maps: mapsRes.data ?? [],
    spaces: spacesRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    teams: teamsRes.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireTrainingFieldAccess(true);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, membershipId } = auth;
  const body = await request.json().catch(() => ({}));
  const entity = String(body.entity ?? "");

  if (entity === "complex") {
    const name = String(body.name ?? "").trim();
    const facility = String(body.facility ?? "").trim() || null;
    const notes = String(body.notes ?? "").trim() || null;
    if (!name) return NextResponse.json({ error: "Complex name is required" }, { status: 400 });

    const { data, error } = await supabase
      .from("training_complexes")
      .insert({ tenant_id: tenantId, name, facility, notes, created_by: membershipId })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ complex: data });
  }

  if (entity === "map") {
    const complexId = String(body.complexId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const backgroundImageUrl = String(body.backgroundImageUrl ?? "").trim();
    const canvasWidth = Number(body.canvasWidth ?? 1200);
    const canvasHeight = Number(body.canvasHeight ?? 800);

    if (!complexId || !name || !backgroundImageUrl) {
      return NextResponse.json({ error: "complexId, name, and backgroundImageUrl are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("training_field_maps")
      .insert({
        tenant_id: tenantId,
        complex_id: complexId,
        name,
        background_image_url: backgroundImageUrl,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        created_by: membershipId,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ map: data });
  }

  return NextResponse.json({ error: "Unsupported entity" }, { status: 400 });
}
