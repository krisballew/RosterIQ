import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  // Validate harness secret
  const secret = req.headers.get("x-rosteriq-harness-secret");
  if (!secret || secret !== process.env.ROSTERIQ_HARNESS_SECRET) {
    return NextResponse.json({ error: "Invalid harness secret" }, { status: 401 });
  }

  const admin = await createAdminClient();
  const results: Record<string, unknown> = {};

  // 1. Create "Coppell FC" tenant
  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("name", "Coppell FC")
    .maybeSingle();

  let tenantId: string;

  if (existingTenant) {
    tenantId = existingTenant.id;
    results.tenant = { status: "already_exists", id: tenantId };
  } else {
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: "Coppell FC",
        timezone: "America/Chicago",
        status: "active",
      })
      .select()
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: tenantError?.message ?? "Failed to create tenant" }, { status: 500 });
    }

    tenantId = tenant.id;
    results.tenant = { status: "created", id: tenantId };

    // Audit: tenant creation
    await admin.from("audit_events").insert({
      actor_user_id: null,
      tenant_id: tenantId,
      action: "create",
      entity_type: "tenant",
      entity_id: tenantId,
      metadata: { name: "Coppell FC", seeded_by: "dev_seed" },
    });
  }

  // 2. Find the platform admin user
  const ADMIN_EMAIL = "ballew.coppellfc@gmail.com";
  const { data: users, error: listError } = await admin.auth.admin.listUsers();

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const adminUser = users.users.find((u) => u.email === ADMIN_EMAIL);
  if (!adminUser) {
    results.membership = {
      status: "skipped",
      reason: `User ${ADMIN_EMAIL} not found — sign up first`,
    };
    return NextResponse.json(results);
  }

  const adminUserId = adminUser.id;

  // 3. Grant platform_admin if not already
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", adminUserId)
    .eq("role", "platform_admin")
    .is("tenant_id", null)
    .maybeSingle();

  if (existingMembership) {
    results.membership = { status: "already_exists" };
  } else {
    const { data: membership, error: membershipError } = await admin
      .from("memberships")
      .insert({
        user_id: adminUserId,
        tenant_id: null,
        role: "platform_admin",
      })
      .select()
      .single();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    results.membership = { status: "created", id: membership.id };

    // Audit: membership creation
    await admin.from("audit_events").insert({
      actor_user_id: adminUserId,
      tenant_id: null,
      action: "create",
      entity_type: "membership",
      entity_id: membership.id,
      metadata: {
        user_email: ADMIN_EMAIL,
        role: "platform_admin",
        seeded_by: "dev_seed",
      },
    });
  }

  return NextResponse.json({ success: true, results });
}
