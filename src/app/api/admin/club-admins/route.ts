import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/roles";

export const runtime = "nodejs";

// GET — list all club admin memberships across all tenants
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);
  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("memberships")
    .select("*, profiles(first_name, last_name, last_login_at), tenants(name)")
    .in("role", ["club_admin", "club_director", "director_of_coaching"])
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data ?? [] });
}

// POST — invite a club admin by email (sends Supabase invite email)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);
  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { email, firstName, lastName, role, tenantId } = body as {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    tenantId?: string;
  };

  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Role is required" }, { status: 400 });
  }
  if (role !== "platform_admin" && !tenantId) {
    return NextResponse.json({ error: "Tenant is required for this role" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Build the redirect URL for after the invite is accepted
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", ".vercel.app") ||
    "http://localhost:3000";

  const redirectTo = `${baseUrl}/auth/callback?next=/portal`;

  // Send invite email via Supabase (creates user + sends invite)
  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      data: {
        first_name: firstName?.trim() ?? "",
        last_name: lastName?.trim() ?? "",
      },
      redirectTo,
    });

  if (inviteError) {
    // If user already exists, just create the membership
    if (!inviteError.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: inviteError.message }, { status: 422 });
    }
  }

  const userId =
    inviteData?.user?.id ??
    (await (async () => {
      // User already exists — find their id
      const { data: users } = await admin.auth.admin.listUsers();
      return users.users.find(
        (u) => u.email === email.trim().toLowerCase()
      )?.id;
    })());

  if (!userId) {
    return NextResponse.json(
      { error: "Could not resolve user ID" },
      { status: 500 }
    );
  }

  // Update profile
  await admin
    .from("profiles")
    .update({
      first_name: firstName?.trim() ?? null,
      last_name: lastName?.trim() ?? null,
    })
    .eq("user_id", userId);

  // Check for existing membership
  const membershipQuery = admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("role", role);

  if (tenantId) {
    membershipQuery.eq("tenant_id", tenantId);
  } else {
    membershipQuery.is("tenant_id", null);
  }

  const { data: existingMembership } = await membershipQuery.maybeSingle();

  if (!existingMembership) {
    const { error: membershipError } = await admin.from("memberships").insert({
      user_id: userId,
      tenant_id: tenantId ?? null,
      role,
    });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 422 });
    }
  }

  // Audit
  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenantId ?? null,
    action: "invite",
    entity_type: "club_admin",
    entity_id: userId,
    metadata: { email: email.trim().toLowerCase(), role, tenant_id: tenantId },
  });

  return NextResponse.json({ success: true, userId });
}
