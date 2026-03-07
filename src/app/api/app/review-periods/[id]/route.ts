import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/app/review-periods/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: period, error: periodError } = await supabase
    .from("review_periods")
    .select("id, tenant_id")
    .eq("id", id)
    .maybeSingle();

  if (periodError) {
    return NextResponse.json({ error: periodError.message }, { status: 500 });
  }
  if (!period) {
    return NextResponse.json({ error: "Review period not found" }, { status: 404 });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("role, tenant_id")
    .eq("user_id", user.id)
    .eq("tenant_id", period.tenant_id);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const isAdmin = (memberships ?? []).some((m) =>
    ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number])
  );

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body?.title === "string") updates.title = body.title.trim();
  if (typeof body?.due_date === "string") updates.due_date = body.due_date;
  if (typeof body?.is_active === "boolean") updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("review_periods")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ period: data });
}
