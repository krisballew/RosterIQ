import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EducationLibraryClient } from "./EducationLibraryClient";

export default async function EducationLibraryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify user has an active membership
  const { data: memberships } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (!memberships || memberships.length === 0) {
    redirect("/portal");
  }

  // Get the user's tenant ID
  const tenantId = memberships[0]?.tenant_id;

  // Fetch public educational content for players
  const { data: content } = await supabase
    .from("training_content")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_published", true)
    .in("audience", ["player", "both"])
    .order("created_at", { ascending: false });

  // Fetch categories
  const { data: categories } = await supabase
    .from("training_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order");

  return (
    <EducationLibraryClient 
      initialContent={content ?? []} 
      initialCategories={categories ?? []} 
    />
  );
}
