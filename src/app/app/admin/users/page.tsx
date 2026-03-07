import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersAdminClient, type TenantUser } from "./UsersAdminClient";

export const runtime = "nodejs";

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships").select("tenant_id, role").eq("user_id", user.id);

  const membershipList = memberships ?? [];
  const isPlatformAdmin = membershipList.some(m => m.role === "platform_admin");
  const isAuthorized = isPlatformAdmin || membershipList.some(m =>
    ["club_admin", "club_director", "director_of_coaching"].includes(m.role)
  );

  if (!isAuthorized) redirect("/app/home");

  const tenantMembership = membershipList.find(m =>
    ["platform_admin", "club_admin", "club_director", "director_of_coaching"].includes(m.role)
    && (m.role === "platform_admin" || m.tenant_id)
  );
  const tenantId = tenantMembership?.tenant_id ?? null;

  const adminClient = createAdminClient();
  let users: TenantUser[] = [];

  if (tenantId) {
    const { data: membershipRows } = await adminClient
      .from("memberships")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("role", "platform_admin")
      .order("created_at", { ascending: false });

    if (membershipRows && membershipRows.length > 0) {
      const userIds = membershipRows.map(m => m.user_id);

      // Profiles and auth emails must be fetched separately (no direct FK to memberships)
      const [profilesRes, authData] = await Promise.all([
        adminClient.from("profiles").select("user_id, first_name, last_name").in("user_id", userIds),
        adminClient.auth.admin.listUsers({ perPage: 1000 }),
      ]);

      const profileMap = new Map((profilesRes.data ?? []).map(p => [p.user_id, p]));
      const emailMap = new Map((authData.data?.users ?? []).map((u: { id: string; email?: string }) => [u.id, u.email ?? ""]));

      users = (membershipRows as any[]).map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        is_active: m.is_active ?? true,
        created_at: m.created_at,
        first_name: profileMap.get(m.user_id)?.first_name ?? null,
        last_name: profileMap.get(m.user_id)?.last_name ?? null,
        email: emailMap.get(m.user_id) ?? "" as string,
      }));
    }
  }

  return <UsersAdminClient initialUsers={users} currentUserId={user.id} />;
}
