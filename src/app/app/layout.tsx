import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { getHighestRole, getRoleLabel, isPlatformAdmin } from "@/lib/roles";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Update last_login_at
  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("user_id", user.id);

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch memberships
  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  const membershipList = memberships ?? [];
  const isAdmin = isPlatformAdmin(membershipList);
  const highestRole = getHighestRole(membershipList);
  const highestRoleLabel = highestRole ? getRoleLabel(highestRole) : "Member";

  // Fetch visible tenants
  const { data: tenants } = await supabase.from("tenants").select("*").order("name");
  const tenantList = tenants ?? [];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isPlatformAdmin={isAdmin} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          highestRoleLabel={highestRoleLabel}
          tenants={tenantList}
          currentTenantId={tenantList[0]?.id ?? null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
