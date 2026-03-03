import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/app/access-requests
// Returns all access requests for tenants where the caller is a club_admin,
// club_director, or director_of_coaching.
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get caller's admin memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"]);

  if (!memberships?.length) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isPlatformAdmin = memberships.some((m) => m.role === "platform_admin");

  let query = supabase
    .from("access_requests")
    .select("*, tenants(name)")
    .order("created_at", { ascending: false });

  if (!isPlatformAdmin) {
    const tenantIds = memberships
      .filter((m) => m.tenant_id !== null)
      .map((m) => m.tenant_id as string);

    if (!tenantIds.length) {
      return NextResponse.json({ requests: [] });
    }
    query = query.in("tenant_id", tenantIds);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}
