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

  const { email, userId: oldUserId } = await req.json().catch(() => ({})) as { email?: string; userId?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const redirectTo = `${baseUrl}/auth/callback?type=invite`;

  // Try a fresh invite (succeeds when the user was deleted from Supabase)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );

  if (inviteError) {
    // User still exists in Supabase — send a password reset / set-password email
    const { error: resetError } = await admin.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );
    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 422 });
    }
  } else {
    // Fresh invite succeeded — a new user was created (old one must have been deleted).
    // Update any memberships that still point to the old user_id.
    const newUserId = inviteData?.user?.id;
    if (newUserId && oldUserId && newUserId !== oldUserId) {
      await admin
        .from("memberships")
        .update({ user_id: newUserId })
        .eq("user_id", oldUserId);
      await admin
        .from("profiles")
        .update({ user_id: newUserId })
        .eq("user_id", oldUserId);
    }
  }

  return NextResponse.json({ success: true });
}
