import { createClient } from "@/lib/supabase/server";
import { AdminsClient, type MembershipRow } from "./AdminsClient";

export default async function AdminsPage() {
  const supabase = await createClient();

  // Get all memberships with profiles for admin roles
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, profiles(first_name, last_name, last_login_at)")
    .in("role", ["platform_admin", "club_admin"])
    .order("created_at", { ascending: false });

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <AdminsClient
      initialMemberships={(memberships ?? []) as MembershipRow[]}
      tenants={tenants ?? []}
    />
  );
}
