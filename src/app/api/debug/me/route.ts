import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: memberships, error: memErr } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  // Also check via admin client (bypasses RLS)
  const admin = createAdminClient();
  const { data: adminMemberships } = await admin
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    memberships_via_session: memberships,
    memberships_via_admin: adminMemberships,
    membership_error: memErr,
  });
}
