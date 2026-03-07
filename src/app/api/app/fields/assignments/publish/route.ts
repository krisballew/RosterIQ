import { NextResponse } from "next/server";
import { requireFieldAdminContext } from "../../_auth";

export const runtime = "nodejs";

export async function POST() {
  const auth = await requireFieldAdminContext();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabase, tenantId, user, membershipId } = auth;

  const { data: draftAssignments, error: draftError } = await supabase
    .from("field_assignments")
    .select("id, team_id")
    .eq("tenant_id", tenantId)
    .eq("status", "draft");

  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });
  if (!draftAssignments || draftAssignments.length === 0) {
    return NextResponse.json({ success: true, published: 0, coachesNotified: 0 });
  }

  const ids = draftAssignments.map((d) => d.id);
  const teamIds = Array.from(new Set(draftAssignments.map((d) => d.team_id)));

  const { error: publishError } = await supabase
    .from("field_assignments")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_by: membershipId,
    })
    .in("id", ids)
    .eq("tenant_id", tenantId);

  if (publishError) return NextResponse.json({ error: publishError.message }, { status: 500 });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, coach_membership_id")
    .in("id", teamIds)
    .eq("tenant_id", tenantId);

  const coachMembershipIds = Array.from(
    new Set((teams ?? []).map((t) => t.coach_membership_id).filter(Boolean))
  );

  await supabase.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: tenantId,
    action: "publish_field_assignments",
    entity_type: "field_assignment",
    entity_id: ids[0] ?? null,
    metadata: {
      published_count: ids.length,
      coach_membership_ids: coachMembershipIds,
      team_ids: teamIds,
    },
  });

  return NextResponse.json({
    success: true,
    published: ids.length,
    coachesNotified: coachMembershipIds.length,
  });
}
