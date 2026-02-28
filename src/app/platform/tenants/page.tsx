import { createClient } from "@/lib/supabase/server";
import { TenantsClient } from "./TenantsClient";

export default async function TenantsPage() {
  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("name");

  return <TenantsClient initialTenants={tenants ?? []} />;
}
