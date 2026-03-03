import { createAdminClient } from "@/lib/supabase/admin";
import { ClubAdminsClient, type ClubAdminRow } from "./ClubAdminsClient";

export const runtime = "nodejs";

export default async function AdminClubAdminsPage() {
  const admin = createAdminClient();

  const [{ data: memberships }, { data: tenants }, { data: usersData }, { data: profiles }] = await Promise.all([
    admin
      .from("memberships")
      .select("*, tenants(name)")
      .in("role", ["club_admin", "club_director", "director_of_coaching"])
      .order("created_at", { ascending: false }),
    admin
      .from("tenants")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("user_id, first_name, last_name, last_login_at"),
  ]);

  // Build lookup maps
  const emailMap = Object.fromEntries(
    (usersData?.users ?? []).map((u) => [u.id, u.email ?? ""])
  );
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.user_id, p])
  );

  // Merge into unified rows
  const adminsWithEmail = (memberships ?? []).map((a) => ({
    ...a,
    email: emailMap[a.user_id] ?? "",
    profiles: profileMap[a.user_id] ?? null,
  }));

  return (
    <ClubAdminsClient
      initialAdmins={adminsWithEmail as ClubAdminRow[]}
      tenants={tenants ?? []}
    />
  );
}
