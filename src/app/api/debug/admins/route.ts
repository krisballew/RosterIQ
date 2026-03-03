import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = createAdminClient();

  const { data: memberships, error: memErr } = await admin
    .from("memberships")
    .select("*, profiles(first_name, last_name, last_login_at), tenants(name)")
    .in("role", ["club_admin", "club_director", "director_of_coaching"])
    .order("created_at", { ascending: false });

  const { data: allMemberships } = await admin
    .from("memberships")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 });

  return NextResponse.json({
    admin_memberships: memberships,
    admin_memberships_error: memErr,
    all_memberships: allMemberships,
    auth_users: usersData?.users?.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
    })),
  });
}
