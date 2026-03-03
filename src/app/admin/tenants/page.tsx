import { createAdminClient } from "@/lib/supabase/admin";
import { TenantsAdminClient, type TenantWithCodes } from "./TenantsAdminClient";

export const runtime = "nodejs";

export default async function AdminTenantsPage() {
  const admin = createAdminClient();
  const { data: tenants } = await admin
    .from("tenants")
    .select("*, access_codes(id, code, is_active)")
    .order("name");

  return (
    <TenantsAdminClient initialTenants={(tenants ?? []) as TenantWithCodes[]} />
  );
}
