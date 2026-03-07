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
    .maybeSingle();

  // If no player profile is linked yet, show a message
  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg w-fit mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">My Reviews</h1>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Player Profile Not Set Up
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    Your player profile hasn&apos;t been linked to your account yet. 
                    Please contact your club administrator to complete your profile setup.
                  </p>
                  <p className="mt-2">
                    Once your profile is set up, you&apos;ll be able to view your performance reviews here.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
