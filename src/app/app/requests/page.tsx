import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsClient, type AccessRequestWithTenant } from "./RequestsClient";

export default async function RequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get caller's memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id);

  const membershipList = memberships ?? [];
  const isAdmin = membershipList.some((m) => m.role === "platform_admin");

  // Allow platform admins and club-level admins
  const isAuthorized =
    isAdmin ||
    membershipList.some((m) =>
      ["club_admin", "club_director", "director_of_coaching"].includes(m.role)
    );

  if (!isAuthorized) {
    redirect("/app/home");
  }

  // Fetch access requests
  let query = supabase
    .from("access_requests")
    .select("*, tenants(name)")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    const tenantIds = membershipList
      .filter((m) => m.tenant_id !== null)
      .map((m) => m.tenant_id as string);

    if (tenantIds.length === 0) {
      return <RequestsClient initialRequests={[]} />;
    }
    query = query.in("tenant_id", tenantIds);
  }

  const { data: requests } = await query;

  return (
    <RequestsClient
      initialRequests={(requests ?? []) as AccessRequestWithTenant[]}
    />
  );
}
