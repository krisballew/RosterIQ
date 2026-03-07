import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlayerTrainingClient from "./PlayerTrainingClient";

export default async function PlayerTrainingPage() {
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

  return <PlayerTrainingClient />;
}
