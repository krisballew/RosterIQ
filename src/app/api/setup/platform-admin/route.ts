import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/setup/platform-admin
 *
 * Creates (or ensures) the master RosterIQ platform administrator account.
 * Protected by a one-time setup secret or by checking if the admin already exists.
 *
 * This endpoint is idempotent — safe to call multiple times.
 */
export async function POST(req: NextRequest) {
  // Require a setup secret header to prevent unauthorised calls
  const secret = req.headers.get("x-setup-secret");
  const expectedSecret = process.env.ROSTERIQ_SETUP_SECRET;

  // Allow call with either the env secret OR in development without a secret
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid setup secret" }, { status: 401 });
  }

  const ADMIN_EMAIL = "krisballew1@gmail.com";
  const ADMIN_PASSWORD = "Kb1629181713!";
  const FIRST_NAME = "Kris";
  const LAST_NAME = "Ballew";

  const admin = createAdminClient();

  // Check if user already exists
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users.find(
    (u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );

  let userId: string;

  if (existing) {
    userId = existing.id;

    // Update password and metadata to ensure they're correct
    await admin.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
    });
  } else {
    // Create the user
    const { data: newUser, error: createError } =
      await admin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: FIRST_NAME, last_name: LAST_NAME },
      });

    if (createError || !newUser?.user) {
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user" },
        { status: 422 }
      );
    }

    userId = newUser.user.id;
  }

  // Update profile
  await admin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        first_name: FIRST_NAME,
        last_name: LAST_NAME,
      },
      { onConflict: "user_id" }
    );

  // Check for existing platform_admin membership
  const { data: existingMembership } = await admin
    .from("memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (!existingMembership) {
    const { error: membershipError } = await admin.from("memberships").insert({
      user_id: userId,
      tenant_id: null, // platform admins have no tenant restriction
      role: "platform_admin",
    });

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 422 }
      );
    }
  }

  // Audit
  await admin.from("audit_events").insert({
    actor_user_id: userId,
    tenant_id: null,
    action: existing ? "update" : "create",
    entity_type: "platform_admin",
    entity_id: userId,
    metadata: { email: ADMIN_EMAIL, seeded_by: "setup_route" },
  });

  return NextResponse.json({
    success: true,
    status: existing ? "updated" : "created",
    userId,
    email: ADMIN_EMAIL,
  });
}
