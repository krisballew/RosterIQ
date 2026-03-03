import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — no auth required.
// Validates an access code and returns the associated tenant name.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { code } = body as { code?: string };

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json(
      { error: "Access code is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("access_codes")
    .select("id, code, tenant_id, is_active, tenants(id, name, status)")
    .eq("code", code.trim().toLowerCase())
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Invalid access code. Please check with your club administrator." },
      { status: 404 }
    );
  }

  if (!data.is_active) {
    return NextResponse.json(
      { error: "This access code has been deactivated. Please contact your club administrator." },
      { status: 403 }
    );
  }

  const tenant = (data.tenants as unknown as { id: string; name: string; status: string } | null);

  if (!tenant || tenant.status !== "active") {
    return NextResponse.json(
      { error: "The organization associated with this code is not currently active." },
      { status: 403 }
    );
  }

  return NextResponse.json({
    tenantId: tenant.id,
    tenantName: tenant.name,
  });
}
