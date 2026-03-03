import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required.
// Creates a new auth user, profile, and access request for the given tenant.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code, firstName, lastName, email, password } = body as {
    code?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };

  // --- Validate inputs ---
  if (!code?.trim()) {
    return NextResponse.json({ error: "Access code is required" }, { status: 400 });
  }
  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // --- Validate access code ---
  const { data: codeRow, error: codeError } = await admin
    .from("access_codes")
    .select("id, tenant_id, is_active, tenants(id, name, status)")
    .eq("code", code.trim().toLowerCase())
    .single();

  if (codeError || !codeRow || !codeRow.is_active) {
    return NextResponse.json(
      { error: "Invalid or inactive access code." },
      { status: 400 }
    );
  }

  const tenant = (codeRow.tenants as unknown as { id: string; name: string; status: string } | null);
  if (!tenant || tenant.status !== "active") {
    return NextResponse.json(
      { error: "The organization associated with this code is not currently active." },
      { status: 400 }
    );
  }

  const tenantId = codeRow.tenant_id as string;

  // --- Check for duplicate pending request ---
  const { data: existingRequest } = await admin
    .from("access_requests")
    .select("id, status")
    .eq("email", email.trim().toLowerCase())
    .eq("tenant_id", tenantId)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingRequest) {
    if (existingRequest.status === "approved") {
      return NextResponse.json(
        { error: "An account with this email already exists for this organization." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "An access request for this email is already pending review." },
      { status: 409 }
    );
  }

  // --- Create auth user ---
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
    },
  });

  if (createError) {
    // Surface duplicate-email errors cleanly
    if (createError.message.toLowerCase().includes("already been registered") ||
        createError.message.toLowerCase().includes("already exists")) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: createError.message }, { status: 422 });
  }

  const userId = newUser.user.id;

  // --- Update profile (trigger creates it; we set first/last name) ---
  await admin
    .from("profiles")
    .update({ first_name: firstName.trim(), last_name: lastName.trim() })
    .eq("user_id", userId);

  // --- Create access request ---
  const { error: requestError } = await admin.from("access_requests").insert({
    tenant_id: tenantId,
    user_id: userId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    email: email.trim().toLowerCase(),
    status: "pending",
  });

  if (requestError) {
    // Clean up the auth user if we couldn't create the request
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Failed to submit access request. Please try again." },
      { status: 500 }
    );
  }

  // --- Audit event ---
  await admin.from("audit_events").insert({
    actor_user_id: userId,
    tenant_id: tenantId,
    action: "create",
    entity_type: "access_request",
    entity_id: userId,
    metadata: { email: email.trim().toLowerCase(), tenant_name: tenant.name },
  });

  return NextResponse.json({
    success: true,
    tenantName: tenant.name,
  });
}
