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
    
    const [playersRes, teamsRes, membershipsRes] = await Promise.all([
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
        .select("id, user_id, role, profiles(first_name, last_name)")
        .eq("tenant_id", membership.tenant_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);
    
    players = (playersRes.data as Player[]) ?? [];
    teams = (teamsRes.data as Team[]) ?? [];
    
    // Get emails from auth.users and combine with membership data
    const { data: { users } } = await admin.auth.admin.listUsers();
    const userEmailMap = new Map(users.map(u => [u.id, u.email ?? ""]));
    
    playerMemberships = (membershipsRes.data ?? []).map((m: any) => ({
      id: m.id,
      user_email: userEmailMap.get(m.user_id) ?? "",
      first_name: m.profiles?.first_name ?? null,
      last_name: m.profiles?.last_name ?? null,
      role: m.role,
    })).sort((a, b) => {
      const aName = `${a.last_name ?? ""} ${a.first_name ?? ""}`.trim();
      const bName = `${b.last_name ?? ""} ${b.first_name ?? ""}`.trim();
      return aName.localeCompare(bName);
    });
  }

  return <RosterClient initialPlayers={players} initialTeams={teams} playerMemberships={playerMemberships} />;
}
