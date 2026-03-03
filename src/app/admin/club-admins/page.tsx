import { createAdminClient } from "@/lib/supabase/admin";
import { ClubAdminsClient, type ClubAdminRow } from "./ClubAdminsClient";

export const runtime = "nodejs";

export default async function AdminClubAdminsPage() {
  const admin = createAdminClient();

  const [{ data: admins }, { data: tenants }, { data: usersData }] = await Promise.all([
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
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Build a map of userId -> email
  const emailMap = Object.fromEntries(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );

  // Merge emails into admin rows
  const adminsWithEmail = (admins ?? []).map((a) => ({
    ...a,
    email: emailMap[a.user_id] ?? "",
  }));

  return (
    <ClubAdminsClient
      initialAdmins={adminsWithEmail as ClubAdminRow[]}
      tenants={tenants ?? []}
    />
  );
}
