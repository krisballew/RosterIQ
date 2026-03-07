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
      .select("id, user_id, role, is_active, created_at, profiles(first_name, last_name)")
      .eq("tenant_id", tenantId)
      .neq("role", "platform_admin")
      .order("created_at", { ascending: false });

    if (membershipRows && membershipRows.length > 0) {
      const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = new Map((authData?.users ?? []).map(u => [u.id, u.email ?? ""]));

      users = (membershipRows as any[]).map(m => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        is_active: m.is_active,
        created_at: m.created_at,
        first_name: m.profiles?.first_name ?? null,
        last_name: m.profiles?.last_name ?? null,
        email: emailMap.get(m.user_id) ?? "",
      }));
    }
  }

  return <UsersAdminClient initialUsers={users} currentUserId={user.id} />;
}
