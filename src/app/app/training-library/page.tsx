import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrainingLibraryClient from "./TrainingLibraryClient";

export default async function TrainingLibraryPage() {
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

  // Only club leadership can access this page
  const allowedRoles = ["club_admin", "director_of_coaching", "club_director", "platform_admin"];
  if (!allowedRoles.includes(membership.role)) {
    redirect("/app/home");
  }

  return <TrainingLibraryClient />;
}
