import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const PLAYER_ROLES = ["select_player", "academy_player"] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/app/reviews/[id]/accept
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: review, error: reviewError } = await supabase
    .from("player_reviews")
    .select("id, tenant_id, status")
    .eq("id", id)
    .maybeSingle();

  if (reviewError) {
    return NextResponse.json({ error: reviewError.message }, { status: 500 });
  }
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.status !== "published") {
    return NextResponse.json(
      { error: "Only published reviews can be accepted" },
      { status: 400 }
    );
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("memberships")
    .select("role, tenant_id, is_active")
    .eq("user_id", user.id)
    .eq("tenant_id", review.tenant_id);

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  const rows = memberships ?? [];
  const isAdmin = rows.some((m) => ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number]));
  const isPlayerRole = rows.some(
    (m) =>
      PLAYER_ROLES.includes(m.role as (typeof PLAYER_ROLES)[number]) &&
      (m.is_active ?? true)
  );

  if (!isAdmin && !isPlayerRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: updated, error: updateError } = await adminClient
    .from("player_reviews")
    .update({
      status: "completed",
      completed_at: nowIso,
      accepted_by_user_id: user.id,
    })
    .eq("id", review.id)
    .select("id, status, accepted_by_user_id, completed_at")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ review: updated });
}
