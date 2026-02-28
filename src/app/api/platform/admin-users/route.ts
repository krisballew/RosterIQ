import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/roles";

// Service role key + next/headers require Node.js runtime (not Edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id);

  if (!isPlatformAdmin(memberships ?? [])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { email, firstName, lastName, role, tenantId } = body as {
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    tenantId: string | null;
  };

  if (!email || !role) {
    return NextResponse.json(
      { error: "email and role are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Create user via Admin API
  const { data: newUser, error: createError } = await admin.auth.admin.createUser(
    {
      email,
      email_confirm: true,
      user_metadata: {
        first_name: firstName ?? "",
        last_name: lastName ?? "",
      },
    }
  );

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 422 });
  }

  const newUserId = newUser.user.id;

  // Update profile
  await admin
    .from("profiles")
    .update({
      first_name: firstName ?? null,
      last_name: lastName ?? null,
    })
    .eq("user_id", newUserId);

  // Create membership
  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: newUserId,
    tenant_id: tenantId ?? null,
    role,
  });

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 422 }
    );
  }

  // Write audit event
  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenantId ?? null,
    action: "create",
    entity_type: "admin_user",
    entity_id: newUserId,
    metadata: { email, role, tenant_id: tenantId },
  });

  return NextResponse.json({ success: true, userId: newUserId });
}
