import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const ASSIGNABLE_ROLES = [
  "club_admin", "club_director", "director_of_coaching",
  "select_coach", "academy_coach", "select_player", "academy_player",
] as const;

// GET — list all users (memberships + profile info) for the caller's tenant
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerMemberships } = await supabase
    .from("memberships").select("tenant_id, role").eq("user_id", user.id);

  const isAdmin = (callerMemberships ?? []).some(m => m.role === "platform_admin");
  const tenantMembership = (callerMemberships ?? []).find(m =>
    ADMIN_ROLES.includes(m.role as typeof ADMIN_ROLES[number]) && m.tenant_id
  );

  if (!isAdmin && !tenantMembership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = tenantMembership?.tenant_id;

  const adminClient = createAdminClient();

  // Query memberships for this tenant (exclude platform_admin)
  let query = adminClient
    .from("memberships")
    .select("id, user_id, role, is_active, created_at, profiles(first_name, last_name)")
    .neq("role", "platform_admin")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("tenant_id", tenantId!);
  }

  const { data: memberships, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ users: [] });
  }

  // Get emails from auth.users via admin
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email ?? ""]));

  const users = (memberships as any[]).map(m => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role,
    is_active: m.is_active,
    created_at: m.created_at,
    first_name: m.profiles?.first_name ?? null,
    last_name: m.profiles?.last_name ?? null,
    email: emailMap.get(m.user_id) ?? "",
  }));

  return NextResponse.json({ users });
}

// POST — invite a single user to the caller's tenant
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerMemberships } = await supabase
    .from("memberships").select("tenant_id, role").eq("user_id", user.id);

  const isAdmin = (callerMemberships ?? []).some(m => m.role === "platform_admin");
  const tenantMembership = (callerMemberships ?? []).find(m =>
    ADMIN_ROLES.includes(m.role as typeof ADMIN_ROLES[number]) && m.tenant_id
  );

  if (!isAdmin && !tenantMembership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = tenantMembership?.tenant_id;

  const body = await req.json().catch(() => ({}));
  const { email, firstName, lastName, role } = body as {
    email?: string; firstName?: string; lastName?: string; role?: string;
  };

  if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!role || !ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${baseUrl}/auth/reset-password`;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      data: { first_name: firstName?.trim() ?? "", last_name: lastName?.trim() ?? "" },
      redirectTo,
    });

  if (inviteError) {
    if (inviteError.message.toLowerCase().includes("already registered")) {
      await adminClient.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    } else {
      return NextResponse.json({ error: inviteError.message }, { status: 422 });
    }
  }

  const userId =
    inviteData?.user?.id ??
    (await (async () => {
      const { data: users } = await adminClient.auth.admin.listUsers();
      return users?.users.find(u => u.email === email.trim().toLowerCase())?.id;
    })());

  if (!userId) {
    return NextResponse.json({ error: "Could not resolve user ID" }, { status: 500 });
  }

  await adminClient.from("profiles").update({
    first_name: firstName?.trim() ?? null,
    last_name: lastName?.trim() ?? null,
  }).eq("user_id", userId);

  // Check for existing membership to avoid duplicates
  const { data: existing } = await adminClient
    .from("memberships").select("id")
    .eq("user_id", userId).eq("tenant_id", tenantId!).eq("role", role).maybeSingle();

  if (!existing) {
    const { error: membershipError } = await adminClient.from("memberships").insert({
      user_id: userId, tenant_id: tenantId, role, is_active: true,
    });
    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 422 });
    }
  }

  await adminClient.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenantId,
    action: "invite_user",
    entity_type: "membership",
    entity_id: userId,
    metadata: { email: email.trim().toLowerCase(), role },
  });

  return NextResponse.json({ success: true, userId });
}
