import { createClient } from "@/lib/supabase/server";
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
  }> = [];

  if (membership?.tenant_id) {
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
      supabase
        .from("memberships")
        .select("id, user_email, first_name, last_name")
        .eq("tenant_id", membership.tenant_id)
        .in("role", ["select_player", "academy_player"])
        .eq("is_active", true)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
    ]);
    players = (playersRes.data as Player[]) ?? [];
    teams = (teamsRes.data as Team[]) ?? [];
    playerMemberships = membershipsRes.data ?? [];
  }

  return <RosterClient initialPlayers={players} initialTeams={teams} playerMemberships={playerMemberships} />;
}
