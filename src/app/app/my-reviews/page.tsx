import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyReviewsClient } from "./MyReviewsClient";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["select_player", "academy_player"] as const;

export default async function MyReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify user is a player
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role,id,tenant_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const isAuthorized = (memberships ?? []).some((m) =>
    ALLOWED_ROLES.includes(m.role as (typeof ALLOWED_ROLES)[number])
  );

  if (!isAuthorized) {
    redirect("/app/home");
  }

  const membership = memberships?.[0];
  if (!membership) {
    redirect("/app/home");
  }

  // Get the player profile for this user
  const { data: player } = await supabase
    .from("players")
    .select("id, first_name, last_name, team_assigned, age_division, status")
    .eq("membership_id", membership.id)
    .single();

  if (!player) {
    redirect("/app/home");
  }

  // Get all review periods
  const { data: periods } = await supabase
    .from("review_periods")
    .select("*")
    .eq("tenant_id", membership.tenant_id)
    .order("season_year", { ascending: false })
    .order("season", { ascending: false });

  // Get reviews for this player (all statuses)
  const { data: reviews } = await supabase
    .from("player_reviews")
    .select("*")
    .eq("player_id", player.id)
    .order("created_at", { ascending: false });

  return (
    <MyReviewsClient
      player={player}
      periods={periods ?? []}
      reviews={reviews ?? []}
    />
  );
}
