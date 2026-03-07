import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getHighestRole } from "@/lib/roles";

export default async function EducationPage() {
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
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!memberships || memberships.length === 0) {
    redirect("/portal");
  }

  const highestRole = getHighestRole(memberships);

  // Route users based on their highest role
  const adminRoles = ["platform_admin", "club_admin", "director_of_coaching", "club_director"];
  const coachRoles = ["select_coach", "academy_coach"];
  const playerRoles = ["select_player", "academy_player"];

  if (highestRole && adminRoles.includes(highestRole)) {
    redirect("/app/training-library");
  } else if (highestRole && coachRoles.includes(highestRole)) {
    redirect("/app/training");
  } else if (highestRole && playerRoles.includes(highestRole)) {
    redirect("/app/education-library");
  } else {
    // Default fallback
    redirect("/app/home");
  }
}
