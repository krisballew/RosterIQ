import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401, supabase };

  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  if (error) return { error: error.message, status: 500, supabase };

  const membershipList = memberships ?? [];
  const tenantId = membershipList.find((m) => m.tenant_id)?.tenant_id ?? null;
  if (!tenantId) return { error: "No tenant membership found", status: 403, supabase };

  const isAdmin = membershipList.some(
    (m) => m.tenant_id === tenantId && ADMIN_ROLES.includes(m.role as (typeof ADMIN_ROLES)[number])
  );

  if (!isAdmin) return { error: "Forbidden", status: 403, supabase };

  return { error: null, status: 200, supabase, user, tenantId };
}

// POST /api/app/review-periods
export async function POST(request: NextRequest) {
  const ctx = await getContext();
  if (ctx.error || !ctx.tenantId || !ctx.user) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json().catch(() => ({}));

  const season = body?.season === "spring" ? "spring" : body?.season === "fall" ? "fall" : null;
  const seasonYear = Number(body?.season_year);
  const dueDate = typeof body?.due_date === "string" ? body.due_date : "";

  if (!season || !Number.isInteger(seasonYear) || seasonYear < 2000 || seasonYear > 2100 || !dueDate) {
    return NextResponse.json({ error: "season, season_year, and due_date are required" }, { status: 400 });
  }

  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : `${season === "fall" ? "Fall" : "Spring"} ${seasonYear}`;

  const { data, error } = await ctx.supabase
    .from("review_periods")
    .insert({
      tenant_id: ctx.tenantId,
      season,
      season_year: seasonYear,
      title,
      due_date: dueDate,
      is_active: body?.is_active !== false,
      created_by: ctx.user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ period: data }, { status: 201 });
}
