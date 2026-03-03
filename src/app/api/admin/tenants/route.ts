import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/roles";

export const runtime = "nodejs";

// GET — list all tenants with their access codes
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);

  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: tenants, error } = await admin
    .from("tenants")
    .select("*, access_codes(id, code, is_active)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tenants: tenants ?? [] });
}

// POST — create tenant + access code atomically
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: memberships } = await supabase
    .from("memberships").select("*").eq("user_id", user.id);

  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, timezone, addressText, logoUrl, accessCode } = body as {
    name?: string;
    timezone?: string;
    addressText?: string;
    logoUrl?: string;
    accessCode?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Club name is required" }, { status: 400 });
  }
  if (!accessCode?.trim()) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }

  const cleanCode = accessCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!cleanCode) {
    return NextResponse.json(
      { error: "Access code must contain alphanumeric characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Check code uniqueness
  const { data: existing } = await admin
    .from("access_codes")
    .select("id")
    .eq("code", cleanCode)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Access code "${cleanCode}" is already in use. Choose a different code.` },
      { status: 409 }
    );
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      name: name.trim(),
      timezone: timezone ?? "America/Chicago",
      address_text: addressText?.trim() || null,
      logo_url: logoUrl?.trim() || null,
      status: "active",
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: tenantError?.message ?? "Failed to create tenant" },
      { status: 422 }
    );
  }

  // Create access code
  const { error: codeError } = await admin.from("access_codes").insert({
    code: cleanCode,
    tenant_id: tenant.id,
    is_active: true,
  });

  if (codeError) {
    // Roll back tenant
    await admin.from("tenants").delete().eq("id", tenant.id);
    return NextResponse.json({ error: codeError.message }, { status: 422 });
  }

  // Audit
  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenant.id,
    action: "create",
    entity_type: "tenant",
    entity_id: tenant.id,
    metadata: { name: tenant.name, access_code: cleanCode },
  });

  return NextResponse.json({ success: true, tenant, accessCode: cleanCode });
}
