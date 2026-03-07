import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CoachTrainingClient from "./CoachTrainingClient";

export default async function CoachTrainingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership) {
    redirect("/portal");
  }

  // Coaches and leadership can access this page
  const allowedRoles = [
    "select_coach",
    "academy_coach",
    "director_of_coaching",
    "club_admin",
    "club_director",
    "platform_admin",
  ];
  if (!allowedRoles.includes(membership.role)) {
    redirect("/app/home");
  }

  return <CoachTrainingClient />;
}
