import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { RosterClient } from "./RosterClient";
import type { Player, Team } from "@/types/database";

export const runtime = "nodejs";

export default async function RosterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get the user's tenant
  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  let players: Player[] = [];
  let teams: Team[] = [];
  let playerMemberships: Array<{
    id: string;
    user_email: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
  }> = [];

  if (membership?.tenant_id) {
    const admin = createAdminClient();
    
    const [playersRes, teamsRes, membershipsRes, profilesRes] = await Promise.all([
      supabase
        .from("players")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("teams")
        .select("*")
        .eq("tenant_id", membership.tenant_id)
        .order("name", { ascending: true }),
      admin
        .from("memberships")
        .select("id, user_id, role")
        .eq("tenant_id", membership.tenant_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      admin
        .from("profiles")
        .select("user_id, first_name, last_name"),
    ]);
    
    players = (playersRes.data as Player[]) ?? [];
    teams = (teamsRes.data as Team[]) ?? [];
    
    // Get emails from auth.users and combine with membership data
    const { data: { users } } = await admin.auth.admin.listUsers();
    const userEmailMap = new Map(users.map(u => [u.id, u.email ?? ""]));
    const profilesMap = new Map(
      (profilesRes.data ?? []).map((p: any) => [p.user_id, { first_name: p.first_name, last_name: p.last_name }])
    );
    
    // Debug logging
    console.log("Memberships data:", membershipsRes.data);
    console.log("Memberships error:", membershipsRes.error);
    console.log("Profiles count:", profilesRes.data?.length ?? 0);
    console.log("Users count:", users.length);
    console.log("Tenant ID:", membership.tenant_id);
    
    playerMemberships = (membershipsRes.data ?? []).map((m: any) => {
      const profile = profilesMap.get(m.user_id);
      return {
        id: m.id,
        user_email: userEmailMap.get(m.user_id) ?? "",
        first_name: profile?.first_name ?? null,
        last_name: profile?.last_name ?? null,
        role: m.role,
      };
    }).sort((a, b) => {
      const aName = `${a.last_name ?? ""} ${a.first_name ?? ""}`.trim();
      const bName = `${b.last_name ?? ""} ${b.first_name ?? ""}`.trim();
      return aName.localeCompare(bName);
    });
    
    console.log("Final playerMemberships:", playerMemberships);
  }

  return <RosterClient initialPlayers={players} initialTeams={teams} playerMemberships={playerMemberships} />;
}
