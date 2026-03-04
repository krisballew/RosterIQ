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

  if (membership?.tenant_id) {
    const [playersRes, teamsRes] = await Promise.all([
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
    ]);
    players = (playersRes.data as Player[]) ?? [];
    teams = (teamsRes.data as Team[]) ?? [];
  }

  return <RosterClient initialPlayers={players} initialTeams={teams} />;
}
