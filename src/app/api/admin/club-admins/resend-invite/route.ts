import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/roles";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);
  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email } = await req.json().catch(() => ({})) as { email?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    redirectTo: `${baseUrl}/auth/callback?type=invite`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ success: true });
}
