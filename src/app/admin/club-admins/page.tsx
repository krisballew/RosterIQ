import { createAdminClient } from "@/lib/supabase/admin";
import { ClubAdminsClient, type ClubAdminRow } from "./ClubAdminsClient";

export const runtime = "nodejs";

export default async function AdminClubAdminsPage() {
  const admin = createAdminClient();

  const [{ data: admins }, { data: tenants }] = await Promise.all([
    admin
      .from("memberships")
      .select("*, profiles(first_name, last_name, last_login_at), tenants(name)")
      .in("role", ["club_admin", "club_director", "director_of_coaching"])
      .order("created_at", { ascending: false }),
    admin
      .from("tenants")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <ClubAdminsClient
      initialAdmins={(admins ?? []) as ClubAdminRow[]}
      tenants={tenants ?? []}
    />
  );
}
