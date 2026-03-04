import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LineupBuilderClient } from "./LineupBuilderClient";
import type { TeamWithPlayers } from "./lineupTypes";
import type { Player } from "@/types/database";

export const runtime = "nodejs";

export default async function LineupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) redirect("/app/home");

  const tenantId = membership.tenant_id;

  // Fetch teams
  const { data: teamsData } = await supabase
    .from("teams")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name");

  // Fetch all players for tenant
  const { data: playersData } = await supabase
    .from("players")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_name")
    .order("first_name");

  const players: Player[] = (playersData as Player[]) ?? [];
  let dbTeams = teamsData ?? [];

  // Synthesise virtual teams from player.team_assigned when no real teams exist
  if (dbTeams.length === 0) {
    const teamNames = Array.from(
      new Set(players.map((p) => p.team_assigned).filter(Boolean))
    ) as string[];

    dbTeams = teamNames.map((name) => ({
      id: `virtual:${name}`,
      tenant_id: tenantId,
      name,
      age_division: null,
      birth_year: null,
      roster_limit: 16,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  const teamNames = new Set(dbTeams.map((t) => t.name));

  const teams: TeamWithPlayers[] = dbTeams.map((team) => ({
    ...team,
    players: players.filter((p) => p.team_assigned === team.name),
  }));

  const unassigned = players.filter(
    (p) => !p.team_assigned || !teamNames.has(p.team_assigned)
  );

  return (
    <LineupBuilderClient
      initialTeams={teams}
      initialUnassigned={unassigned}
    />
  );
}
