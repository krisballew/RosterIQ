import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface ImportRow {
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  team_assigned?: string | null;
  age_division?: string | null;
  primary_parent_email?: string | null;
  secondary_parent_email?: string | null;
  positions?: string[];
  birth_year?: number | null;
  status?: "active" | "inactive" | "practice_only";
}

// POST /api/app/players/import
// Bulk-insert players. Requires club_admin / club_director / director_of_coaching.
// Body: { players: ImportRow[] }
// Returns: { inserted: number, skipped: number, errors: string[] }
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .in("role", ["platform_admin", "club_admin", "club_director", "director_of_coaching"])
    .not("tenant_id", "is", null)
    .limit(1)
    .single();

  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenantId = membership.tenant_id;
  const body = await request.json();
  const rows: ImportRow[] = body.players ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No players provided" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 players per import" }, { status: 400 });
  }

  // Fetch existing players to detect duplicates (same first+last+dob)
  const { data: existing } = await supabase
    .from("players")
    .select("first_name, last_name, date_of_birth")
    .eq("tenant_id", tenantId);

  const existingKeys = new Set(
    (existing ?? []).map((p) =>
      `${p.first_name.toLowerCase()}|${p.last_name.toLowerCase()}|${p.date_of_birth ?? ""}`
    )
  );

  const toInsert: Record<string, unknown>[] = [];
  const skippedNames: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fn = (row.first_name ?? "").trim();
    const ln = (row.last_name ?? "").trim();

    if (!fn || !ln) {
      errors.push(`Row ${i + 1}: missing first or last name, skipped.`);
      continue;
    }

    const dobStr = row.date_of_birth?.trim() || null;
    const key = `${fn.toLowerCase()}|${ln.toLowerCase()}|${dobStr ?? ""}`;

    if (existingKeys.has(key)) {
      skippedNames.push(`${fn} ${ln}`);
      continue;
    }

    // Derive birth_year from dob if not provided
    let birthYear: number | null = row.birth_year ?? null;
    if (!birthYear && dobStr) {
      const yr = new Date(dobStr).getFullYear();
      if (!isNaN(yr)) birthYear = yr;
    }

    toInsert.push({
      tenant_id: tenantId,
      first_name: fn,
      last_name: ln,
      date_of_birth: dobStr,
      team_assigned: row.team_assigned?.trim() || null,
      age_division: row.age_division?.trim() || null,
      primary_parent_email: row.primary_parent_email?.trim() || null,
      secondary_parent_email: row.secondary_parent_email?.trim() || null,
      positions: row.positions ?? [],
      birth_year: birthYear,
      status: row.status ?? "active",
    });

    existingKeys.add(key); // prevent duplicate within this batch
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("players").insert(toInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    inserted = toInsert.length;
  }

  return NextResponse.json({
    inserted,
    skipped: skippedNames.length,
    skippedNames,
    errors,
  });
}
