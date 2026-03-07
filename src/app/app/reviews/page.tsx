import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewsClient } from "./ReviewsClient";

export const runtime = "nodejs";

const ALLOWED_ROLES = [
  "platform_admin",
  "club_admin",
  "club_director",
  "director_of_coaching",
  "select_coach",
  "academy_coach",
] as const;

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id);

  const isAuthorized = (memberships ?? []).some((m) =>
    ALLOWED_ROLES.includes(m.role as (typeof ALLOWED_ROLES)[number])
  );

  if (!isAuthorized) {
    redirect("/app/home");
  }

  return <ReviewsClient />;
}
