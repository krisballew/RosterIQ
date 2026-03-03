import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlatformAdmin } from "@/lib/roles";

export const runtime = "nodejs";

// PATCH — update tenant details or access code
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const { name, timezone, addressText, logoUrl, status, accessCode } = body as {
    name?: string;
    timezone?: string;
    addressText?: string;
    logoUrl?: string;
    status?: string;
    accessCode?: string;
  };

  const admin = createAdminClient();

  // Update tenant fields
  const updatePayload: Record<string, unknown> = {};
  if (name !== undefined) updatePayload.name = name.trim();
  if (timezone !== undefined) updatePayload.timezone = timezone;
  if (addressText !== undefined) updatePayload.address_text = addressText?.trim() || null;
  if (logoUrl !== undefined) updatePayload.logo_url = logoUrl?.trim() || null;
  if (status !== undefined) updatePayload.status = status;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await admin
      .from("tenants")
      .update(updatePayload)
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  }

  // Update access code if provided
  if (accessCode !== undefined) {
    const cleanCode = accessCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanCode) {
      // Check uniqueness (exclude this tenant's existing codes)
      const { data: existing } = await admin
        .from("access_codes")
        .select("id, tenant_id")
        .eq("code", cleanCode)
        .maybeSingle();

      if (existing && existing.tenant_id !== id) {
        return NextResponse.json(
          { error: `Access code "${cleanCode}" is already in use by another tenant.` },
          { status: 409 }
        );
      }

      if (!existing) {
        // Deactivate old codes and add new one
        await admin
          .from("access_codes")
          .update({ is_active: false })
          .eq("tenant_id", id);

        await admin.from("access_codes").insert({
          code: cleanCode,
          tenant_id: id,
          is_active: true,
        });
      }
    }
  }

  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: id,
    action: "update",
    entity_type: "tenant",
    entity_id: id,
    metadata: updatePayload,
  });

  return NextResponse.json({ success: true });
}

// DELETE — permanently delete a tenant (soft: set status to inactive)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  const { error } = await admin
    .from("tenants")
    .update({ status: "inactive" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });

  await admin.from("audit_events").insert({
    actor_user_id: user.id,
    tenant_id: id,
    action: "deactivate",
    entity_type: "tenant",
    entity_id: id,
    metadata: {},
  });

  return NextResponse.json({ success: true });
}
