import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADMIN_ROLES = ["platform_admin", "club_admin", "club_director", "director_of_coaching"] as const;
const ASSIGNABLE_ROLES = [
  "club_admin", "club_director", "director_of_coaching",
  "select_coach", "academy_coach", "select_player", "academy_player",
] as const;

// POST — bulk invite users to the caller's tenant
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
  const entries: Array<{ email: string; firstName?: string; lastName?: string; role: string }> =
    body.users ?? [];

  if (!Array.isArray(entries) || entries.length === 0) {
    return NextResponse.json({ error: "users array is required" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectTo = `${baseUrl}/auth/reset-password`;

  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  for (const entry of entries) {
    const email = entry.email?.trim().toLowerCase();
    const role = entry.role;

    if (!email) {
      results.push({ email: entry.email ?? "", success: false, error: "Email is required" });
      continue;
    }
    if (!role || !ASSIGNABLE_ROLES.includes(role as typeof ASSIGNABLE_ROLES[number])) {
      results.push({ email, success: false, error: `Invalid role: ${role}` });
      continue;
    }

    try {
      const { data: inviteData, error: inviteError } =
        await adminClient.auth.admin.inviteUserByEmail(email, {
          data: {
            first_name: entry.firstName?.trim() ?? "",
            last_name: entry.lastName?.trim() ?? "",
          },
          redirectTo,
        });

      if (inviteError && !inviteError.message.toLowerCase().includes("already registered")) {
        results.push({ email, success: false, error: inviteError.message });
        continue;
      }

      if (inviteError?.message.toLowerCase().includes("already registered")) {
        await adminClient.auth.resetPasswordForEmail(email, { redirectTo });
      }

      const userId =
        inviteData?.user?.id ??
        (await (async () => {
          const { data: users } = await adminClient.auth.admin.listUsers();
          return users?.users.find(u => u.email === email)?.id;
        })());

      if (!userId) {
        results.push({ email, success: false, error: "Could not resolve user ID" });
        continue;
      }

      await adminClient.from("profiles").update({
        first_name: entry.firstName?.trim() ?? null,
        last_name: entry.lastName?.trim() ?? null,
      }).eq("user_id", userId);

      const { data: existing } = await adminClient
        .from("memberships").select("id")
        .eq("user_id", userId).eq("tenant_id", tenantId!).eq("role", role).maybeSingle();

      if (!existing) {
        const { error: membershipError } = await adminClient.from("memberships").insert({
          user_id: userId, tenant_id: tenantId, role, is_active: true,
        });
        if (membershipError) {
          results.push({ email, success: false, error: membershipError.message });
          continue;
        }
      }

      results.push({ email, success: true });
    } catch (err: unknown) {
      results.push({ email, success: false, error: String(err) });
    }
  }

  await adminClient.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenantId,
    action: "bulk_invite_users",
    entity_type: "membership",
    entity_id: null,
    metadata: { count: entries.length, results },
  });

  return NextResponse.json({ results });
}
