import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/app/access-requests/[id]/approve
// Approves an access request: assigns the specified role and creates a membership.
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: string };

  if (!role) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }

  // Fetch the request
  const { data: request, error: fetchError } = await supabase
    .from("access_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Access request not found" }, { status: 404 });
  }

  if (request.status !== "pending") {
    return NextResponse.json(
      { error: `Request has already been ${request.status}` },
      { status: 409 }
    );
  }

  // Verify caller has admin rights for this tenant
  const { data: callerMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("tenant_id", request.tenant_id)
    .in("role", ["club_admin", "club_director", "director_of_coaching"])
    .maybeSingle();

  const { data: platformAdminMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  if (!callerMembership && !platformAdminMembership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Create membership for the user
  const { error: membershipError } = await admin.from("memberships").insert({
    user_id: request.user_id,
    tenant_id: request.tenant_id,
    role,
  });

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 422 });
  }

  // Update access request status
  await admin
    .from("access_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Audit event
  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: request.tenant_id,
    action: "approve",
    entity_type: "access_request",
    entity_id: id,
    metadata: {
      user_id: request.user_id,
      email: request.email,
      assigned_role: role,
    },
  });

  return NextResponse.json({ success: true });
}
