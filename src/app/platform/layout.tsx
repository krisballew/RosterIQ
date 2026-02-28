import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/roles";
import { Sidebar } from "@/components/shell/Sidebar";
import { Header } from "@/components/shell/Header";
import { getHighestRole, getRoleLabel } from "@/lib/roles";

export default async function PlatformLayout({
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

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  const membershipList = memberships ?? [];
  if (!isPlatformAdmin(membershipList)) {
    redirect("/app/home");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const highestRole = getHighestRole(membershipList);
  const highestRoleLabel = highestRole ? getRoleLabel(highestRole) : "Member";

  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("name");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isPlatformAdmin={true} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          profile={profile}
          highestRoleLabel={highestRoleLabel}
          tenants={tenants ?? []}
          currentTenantId={null}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
